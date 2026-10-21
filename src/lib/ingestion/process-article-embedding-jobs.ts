import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  ARTICLE_EMBEDDING_MODEL,
  deleteArticleDocuments,
  findRelatedArticleIds,
  isPineconeConfigured,
  pineconeErrorMessage,
  upsertArticleEmbeddings,
  type ArticleEmbeddingInput,
} from "@/lib/pinecone/article-index";

const EMBEDDING_BATCH_SIZE = 48;
const MAX_JOB_LIMIT = 200;

interface ClaimedEmbeddingJob extends ArticleEmbeddingInput {
  attempts: number;
}

interface ClaimedDeletion {
  article_id: string;
  attempts: number;
}

interface EmbeddingCandidateJob {
  article_id: string;
  content_hash: string;
  model: string;
  status: string;
}

interface CandidateRow {
  article_id: string;
  related_article_id: string;
  article_content_hash: string;
  related_content_hash: string;
  score: number;
  model: string;
  updated_at: string;
}

export interface ArticleEmbeddingJobSummary {
  configured: boolean;
  embeddingsClaimed: number;
  embeddingsIndexed: number;
  embeddingsFailed: number;
  vectorsDeleted: number;
  deletionsFailed: number;
}

async function processDeletionJobs(
  client: ReturnType<typeof createServiceClient>,
  limit: number
): Promise<{ deleted: number; failed: number }> {
  const { data, error } = await client.rpc("claim_article_embedding_deletions", {
    requested_limit: Math.min(limit, 500),
  });
  if (error) throw error;

  const jobs = (data ?? []) as ClaimedDeletion[];
  if (jobs.length === 0) return { deleted: 0, failed: 0 };

  const ids = jobs.map((job) => job.article_id);
  try {
    await deleteArticleDocuments(ids);
    const { error: completionError } = await client.rpc("complete_article_embedding_deletions", {
      article_ids: ids,
      succeeded: true,
      error_message: null,
    });
    if (completionError) throw completionError;
    return { deleted: ids.length, failed: 0 };
  } catch (cause) {
    const { error: completionError } = await client.rpc("complete_article_embedding_deletions", {
      article_ids: ids,
      succeeded: false,
      error_message: pineconeErrorMessage(cause),
    });
    if (completionError) console.error("Could not record Pinecone deletion failure:", completionError.message);
    return { deleted: 0, failed: ids.length };
  }
}

async function refreshRelatedCandidates(
  client: ReturnType<typeof createServiceClient>,
  jobs: ClaimedEmbeddingJob[]
): Promise<Map<string, string | null>> {
  const queryResults = await Promise.all(jobs.map(async (job) => {
    try {
      const matches = await findRelatedArticleIds(job, 12);
      return { job, matches, error: null as string | null };
    } catch (cause) {
      return { job, matches: [], error: pineconeErrorMessage(cause) };
    }
  }));

  const successfulQueries = queryResults.filter((result) => result.error === null);
  const targetIds = [...new Set(successfulQueries.flatMap(({ matches }) => matches.map((match) => match.id)))];

  try {
    const { data: storedJobs, error: storedJobsError } = targetIds.length
      ? await client.from("article_embedding_jobs").select("article_id,content_hash,model,status").in("article_id", targetIds)
      : { data: [], error: null };
    if (storedJobsError) throw storedJobsError;

    const targetById = new Map<string, EmbeddingCandidateJob>(
      ((storedJobs ?? []) as EmbeddingCandidateJob[]).map((job) => [job.article_id, job])
    );
    for (const job of successfulQueries.map((result) => result.job)) {
      targetById.set(job.article_id, {
        article_id: job.article_id,
        content_hash: job.content_hash,
        model: ARTICLE_EMBEDDING_MODEL,
        status: "indexed",
      });
    }

    const candidateRows = new Map<string, CandidateRow>();
    const now = new Date().toISOString();
    for (const result of successfulQueries) {
      for (const match of result.matches) {
        const target = targetById.get(match.id);
        if (!target || target.status !== "indexed" || target.model !== ARTICLE_EMBEDDING_MODEL) continue;

        const forward: CandidateRow = {
          article_id: result.job.article_id,
          related_article_id: match.id,
          article_content_hash: result.job.content_hash,
          related_content_hash: target.content_hash,
          score: match.score,
          model: ARTICLE_EMBEDDING_MODEL,
          updated_at: now,
        };
        const reverse: CandidateRow = {
          article_id: match.id,
          related_article_id: result.job.article_id,
          article_content_hash: target.content_hash,
          related_content_hash: result.job.content_hash,
          score: match.score,
          model: ARTICLE_EMBEDDING_MODEL,
          updated_at: now,
        };
        candidateRows.set(`${forward.article_id}:${forward.related_article_id}`, forward);
        candidateRows.set(`${reverse.article_id}:${reverse.related_article_id}`, reverse);
      }
    }

    if (successfulQueries.length > 0) {
      const { error: deleteError } = await client
        .from("article_related_candidates")
        .delete()
        .in("article_id", successfulQueries.map(({ job }) => job.article_id));
      if (deleteError) throw deleteError;
    }
    if (candidateRows.size > 0) {
      const { error: upsertError } = await client
        .from("article_related_candidates")
        .upsert([...candidateRows.values()], { onConflict: "article_id,related_article_id" });
      if (upsertError) throw upsertError;
    }

    return new Map(queryResults.map(({ job, error }) => [job.article_id, error]));
  } catch (cause) {
    const error = pineconeErrorMessage(cause);
    return new Map(jobs.map((job) => [job.article_id, error]));
  }
}

async function processEmbeddingJobs(
  client: ReturnType<typeof createServiceClient>,
  limit: number
): Promise<{ claimed: number; indexed: number; failed: number }> {
  const { data, error } = await client.rpc("claim_article_embedding_jobs", {
    requested_limit: Math.min(Math.max(Math.trunc(limit), 1), MAX_JOB_LIMIT),
  });
  if (error) throw error;

  const jobs = (data ?? []) as ClaimedEmbeddingJob[];
  let indexed = 0;
  let failed = 0;

  for (let offset = 0; offset < jobs.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = jobs.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    let batchError: string | null = null;

    try {
      await upsertArticleEmbeddings(batch);
    } catch (cause) {
      batchError = pineconeErrorMessage(cause);
      failed += batch.length;
      console.error(`Pinecone article embedding batch failed: ${batchError}`);
    }

    const candidateErrors = batchError ? new Map<string, string | null>() : await refreshRelatedCandidates(client, batch);
    if (!batchError) {
      for (const error of candidateErrors.values()) {
        if (error) failed++;
        else indexed++;
      }
    }

    const { error: completionError } = await client.rpc("complete_article_embedding_jobs", {
      results: batch.map((job) => ({
        article_id: job.article_id,
        content_hash: job.content_hash,
        ok: !batchError && !candidateErrors.get(job.article_id),
        error: batchError ?? candidateErrors.get(job.article_id) ?? null,
      })),
    });
    if (completionError) {
      // The processing lease expires after 10 minutes and will be recovered by the next cron run.
      throw completionError;
    }
  }

  return { claimed: jobs.length, indexed, failed };
}

export async function processArticleEmbeddingJobs(limit = MAX_JOB_LIMIT): Promise<ArticleEmbeddingJobSummary> {
  if (!isPineconeConfigured()) {
    return {
      configured: false,
      embeddingsClaimed: 0,
      embeddingsIndexed: 0,
      embeddingsFailed: 0,
      vectorsDeleted: 0,
      deletionsFailed: 0,
    };
  }

  const client = createServiceClient();
  const deletions = await processDeletionJobs(client, limit);
  const embeddings = await processEmbeddingJobs(client, limit);

  return {
    configured: true,
    embeddingsClaimed: embeddings.claimed,
    embeddingsIndexed: embeddings.indexed,
    embeddingsFailed: embeddings.failed,
    vectorsDeleted: deletions.deleted,
    deletionsFailed: deletions.failed,
  };
}

export { ARTICLE_EMBEDDING_MODEL };
