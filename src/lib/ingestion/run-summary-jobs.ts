import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { extractArticleContent } from "@/lib/ingestion/article-content";
import {
  ARTICLE_SUMMARY_MODEL,
  ARTICLE_SUMMARY_PROMPT_VERSION,
  generateArticleSummary,
  isArticleSummaryEnabled,
} from "@/lib/ingestion/article-summary";

type ClaimedJob = { article_id: string; attempt_count: number; prompt_version: string };
type SummaryArticle = { id: string; title: string; url: string };
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
      .select("id,title,url")
      .eq("id", job.article_id)
      .maybeSingle();
    if (articleError) throw articleError;
    if (!article) {
      await updateJob(client, job, { status: "unavailable", error_code: "article_missing", lease_until: null });
      return "unavailable";
    }

    const typedArticle = article as SummaryArticle;
    const extracted = await extractArticleContent(typedArticle.url);
    const articleText = extracted.text?.trim() ?? "";
    if (!articleText || (extracted.status !== "supported" && extracted.status !== "partial")) {
      const retryable = extracted.status === "failed" && job.attempt_count < 3;
      await updateJob(client, job, {
        status: extracted.status === "failed" ? "failed" : "unavailable",
        extraction_status: extracted.status,
        error_code: extracted.reason ?? extracted.status,
        lease_until: null,
        retry_after: retryable ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
      });
      return extracted.status === "failed" ? "failed" : "unavailable";
    }

    const summary = await generateArticleSummary(typedArticle.title, articleText, extracted.status === "partial" ? "partial" : "full");
    if (!summary) throw new Error("summary_generation_failed");
    const normalizedInput = `${typedArticle.title.trim().slice(0, 300)}\n${articleText}`;
    const inputSha256 = createHash("sha256").update(normalizedInput).digest("hex");
    await updateJob(client, job, {
      status: "ready",
      extraction_status: extracted.status,
      error_code: extracted.reason,
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
  if (!isArticleSummaryEnabled()) {
    return { claimed: 0, ready: 0, unavailable: 0, failed: 0 };
  }
  const client = createServiceClient();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 8);
  const { data, error } = await client.rpc("claim_article_summary_jobs_by_version", {
    p_prompt_version: ARTICLE_SUMMARY_PROMPT_VERSION,
    p_limit: safeLimit,
  });
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
