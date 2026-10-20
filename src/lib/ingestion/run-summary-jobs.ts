import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { extractArticleContent } from "@/lib/ingestion/article-content";
import {
  ARTICLE_SUMMARY_MODEL,
  generateArticleSummary,
  isArticleSummaryEnabledForSource,
} from "@/lib/ingestion/article-summary";

type ClaimedJob = { article_id: string; attempt_count: number; prompt_version: string };
type SummaryArticle = { id: string; title: string; url: string; source_id: string };
type ServiceClient = ReturnType<typeof createServiceClient>;
type JobOutcome = "ready" | "unavailable" | "failed";

async function updateJob(client: ServiceClient, job: ClaimedJob, patch: Record<string, unknown>) {
  const { error } = await client.from("article_summary_jobs").update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq("article_id", job.article_id).eq("prompt_version", job.prompt_version);
  if (error) throw error;
}

async function processClaimedJob(client: ServiceClient, job: ClaimedJob): Promise<JobOutcome> {
  try {
    const { data: article, error: articleError } = await client
      .from("articles")
      .select("id,title,url,source_id")
      .eq("id", job.article_id)
      .maybeSingle();
    if (articleError) throw articleError;
    if (!article) {
      await updateJob(client, job, { status: "unavailable", error_code: "article_missing", lease_until: null });
      return "unavailable";
    }

    const typedArticle = article as SummaryArticle;
    if (!isArticleSummaryEnabledForSource(typedArticle.source_id)) {
      await updateJob(client, job, { status: "unavailable", error_code: "source_not_allowlisted", lease_until: null });
      return "unavailable";
    }

    const extracted = await extractArticleContent(typedArticle.url);
    if (extracted.status !== "supported" || !extracted.text) {
      const terminal = extracted.status !== "failed";
      await updateJob(client, job, {
        status: terminal ? "unavailable" : "failed",
        extraction_status: extracted.status,
        error_code: extracted.reason ?? extracted.status,
        lease_until: null,
        retry_after: terminal || job.attempt_count >= 3 ? null : new Date(Date.now() + 30 * 60_000).toISOString(),
      });
      return terminal ? "unavailable" : "failed";
    }

    const summary = await generateArticleSummary(typedArticle.title, extracted.text);
    if (!summary) throw new Error("summary_generation_failed");
    const inputSha256 = createHash("sha256").update(extracted.text).digest("hex");
    await updateJob(client, job, {
      status: "ready",
      extraction_status: extracted.status,
      error_code: null,
      lead: summary.content.lead,
      key_points: summary.content.keyPoints,
      model: ARTICLE_SUMMARY_MODEL,
      prompt_version: job.prompt_version,
      input_sha256: inputSha256,
      input_tokens: summary.inputTokens,
      output_tokens: summary.outputTokens,
      generated_at: new Date().toISOString(),
      lease_until: null,
      retry_after: null,
    });
    return "ready";
  } catch (cause) {
    const errorCode = cause instanceof Error && /^[a-z0-9_]{1,48}$/i.test(cause.message)
      ? cause.message
      : "worker_error";
    const retry = job.attempt_count < 3;
    try {
      await updateJob(client, job, {
        status: "failed",
        error_code: errorCode,
        lease_until: null,
        retry_after: retry ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
      });
    } catch (updateError) {
      console.error(`Failed to update summary job ${job.article_id}:`, updateError);
    }
    console.error(`Summary job failed for ${job.article_id}:`, cause);
    return "failed";
  }
}

export async function runSummaryJobs(limit = 8): Promise<{ claimed: number; ready: number; unavailable: number; failed: number }> {
  if (process.env.OPENAI_SUMMARY_ENABLED !== "true" || !process.env.OPENAI_API_KEY) {
    return { claimed: 0, ready: 0, unavailable: 0, failed: 0 };
  }
  const client = createServiceClient();
  const { data, error } = await client.rpc("claim_article_summary_jobs", { p_limit: Math.min(Math.max(Math.trunc(limit), 1), 8) });
  if (error) throw error;

  const jobs = (data ?? []) as ClaimedJob[];
  const outcomes: JobOutcome[] = [];
  let nextIndex = 0;
  const concurrency = Math.min(4, jobs.length);
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= jobs.length) return;
      outcomes.push(await processClaimedJob(client, jobs[index]));
    }
  }));

  return {
    claimed: jobs.length,
    ready: outcomes.filter((outcome) => outcome === "ready").length,
    unavailable: outcomes.filter((outcome) => outcome === "unavailable").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
  };
}
