import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { extractArticleContent } from "@/lib/ingestion/article-content";
import { parseFeed } from "@/lib/ingestion/parse-feed";
import {
  ARTICLE_SUMMARY_MODEL,
  ARTICLE_SUMMARY_PROMPT_VERSION,
  generateArticleSummary,
  isArticleSummaryEnabled,
} from "@/lib/ingestion/article-summary";

type ClaimedJob = { article_id: string; attempt_count: number; prompt_version: string };
type SummaryArticle = { id: string; title: string; url: string; excerpt: string | null; source_id: string | null };
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
      .select("id,title,url,excerpt,source_id")
      .eq("id", job.article_id)
      .maybeSingle();
    if (articleError) throw articleError;
    if (!article) {
      await updateJob(client, job, { status: "unavailable", error_code: "article_missing", lease_until: null });
      return "unavailable";
    }

    const typedArticle = article as SummaryArticle;

    let articleText = "";
    let extractionStatus: "supported" | "partial" = "supported";
    let errorCode: string | null = null;

    // 1. 원문 URL에서 본문 직접 추출 시도
    const extracted = await extractArticleContent(typedArticle.url);
    if (extracted.text && (extracted.status === "supported" || extracted.status === "partial")) {
      articleText = extracted.text.trim();
      extractionStatus = extracted.status;
      errorCode = extracted.reason;
    } else {
      // 2. 본문 직접 추출 불가/차단 시(Medium 403, SPA 등), 저장된 excerpt 또는 피드 원문으로 폴백
      let usableExcerpt = typedArticle.excerpt?.trim() ?? "";

      // 저장된 excerpt가 없거나 짧고(200자 미만) source_id가 있으면 피드에서 본문 복구 시도
      if (usableExcerpt.length < 200 && typedArticle.source_id) {
        try {
          const { data: source } = await client
            .from("sources")
            .select("feed_url, feed_type")
            .eq("id", typedArticle.source_id)
            .maybeSingle();
          if (source?.feed_url && (source.feed_type === "rss" || source.feed_type === "atom")) {
            const feed = await parseFeed(source.feed_url);
            const matched = feed.articles.find((a) => a.url === typedArticle.url || a.title === typedArticle.title);
            if (matched?.excerpt && matched.excerpt.trim().length >= 200) {
              usableExcerpt = matched.excerpt.trim();
              await client.from("articles").update({ excerpt: usableExcerpt }).eq("id", typedArticle.id);
            }
          }
        } catch (feedError) {
          console.warn(`Failed to recover feed excerpt for article ${typedArticle.id}:`, feedError);
        }
      }

      if (usableExcerpt.length >= 200) {
        articleText = usableExcerpt;
        extractionStatus = "partial";
        errorCode = extracted.reason ?? extracted.status;
      } else {
        const retryable = extracted.status === "failed" && job.attempt_count < 3;
        await updateJob(client, job, {
          status: extracted.status === "failed" ? "failed" : "unavailable",
          extraction_status: extracted.status,
          error_code: "no_usable_content",
          lease_until: null,
          retry_after: retryable ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
        });
        return extracted.status === "failed" ? "failed" : "unavailable";
      }
    }

    const summary = await generateArticleSummary(typedArticle.title, articleText, extractionStatus === "partial" ? "partial" : "full");
    if (!summary) throw new Error("summary_generation_failed");
    const normalizedInput = `${typedArticle.title.trim().slice(0, 300)}\n${articleText}`;
    const inputSha256 = createHash("sha256").update(normalizedInput).digest("hex");
    await updateJob(client, job, {
      status: "ready",
      extraction_status: extractionStatus,
      error_code: errorCode,
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

/**
 * 신규 등록된 글 목록 등 특정 articleId들에 대해 큐 대기 없이 즉시 AI 요약을 생성한다.
 * 새 글이 수집되어 곳간 목록에 표시되는 시점에 이미 요약이 준비(ready)되어 있도록 보장한다.
 */
export async function summarizeArticlesDirect(
  articleIds: string[],
  client?: ServiceClient
): Promise<{ ready: number; unavailable: number; failed: number }> {
  if (!isArticleSummaryEnabled() || articleIds.length === 0) {
    return { ready: 0, unavailable: 0, failed: 0 };
  }
  const dbClient = client ?? createServiceClient();
  const jobs: ClaimedJob[] = articleIds.map((id) => ({
    article_id: id,
    attempt_count: 1,
    prompt_version: ARTICLE_SUMMARY_PROMPT_VERSION,
  }));

  try {
    await dbClient.from("article_summary_jobs").upsert(
      articleIds.map((id) => ({
        article_id: id,
        prompt_version: ARTICLE_SUMMARY_PROMPT_VERSION,
        status: "processing",
        attempt_count: 1,
        lease_until: new Date(Date.now() + 3 * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "article_id,prompt_version" }
    );
  } catch (upsertError) {
    console.error("Failed to mark jobs as processing in summarizeArticlesDirect:", upsertError);
  }

  const concurrency = Math.min(4, jobs.length);
  let nextIndex = 0;
  const outcomes: JobOutcome[] = [];

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= jobs.length) return;
        outcomes.push(await processClaimedJob(dbClient, jobs[index]));
      }
    })
  );

  return {
    ready: outcomes.filter((o) => o === "ready").length,
    unavailable: outcomes.filter((o) => o === "unavailable").length,
    failed: outcomes.filter((o) => o === "failed").length,
  };
}

export async function runSummaryJobs(limit = 24): Promise<{ claimed: number; ready: number; unavailable: number; failed: number }> {
  if (!isArticleSummaryEnabled()) {
    return { claimed: 0, ready: 0, unavailable: 0, failed: 0 };
  }
  const client = createServiceClient();
  const targetLimit = Math.min(Math.max(Math.trunc(limit), 1), 32);

  // 추출 실패로 이전에 unavailable 처리된 현재 버전 작업들을 재시도할 수 있도록 pending 상태로 복구
  try {
    await client
      .from("article_summary_jobs")
      .update({
        status: "pending",
        attempt_count: 0,
        lease_until: null,
        retry_after: null,
        updated_at: new Date().toISOString(),
      })
      .eq("prompt_version", ARTICLE_SUMMARY_PROMPT_VERSION)
      .eq("status", "unavailable")
      .neq("error_code", "no_usable_content");
  } catch (resetError) {
    console.warn("Failed to reset unavailable summary jobs:", resetError);
  }

  let totalClaimed = 0;
  let readyCount = 0;
  let unavailableCount = 0;
  let failedCount = 0;

  // DB RPC는 1회당 최대 8건씩 claim하므로, targetLimit까지 연속 배치로 처리하여 처리량을 대폭 확대
  while (totalClaimed < targetLimit) {
    const batchLimit = Math.min(8, targetLimit - totalClaimed);
    const { data, error } = await client.rpc("claim_article_summary_jobs_by_version", {
      p_prompt_version: ARTICLE_SUMMARY_PROMPT_VERSION,
      p_limit: batchLimit,
    });
    if (error) throw error;

    const jobs = (data ?? []) as ClaimedJob[];
    if (jobs.length === 0) break;

    totalClaimed += jobs.length;
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

    readyCount += outcomes.filter((outcome) => outcome === "ready").length;
    unavailableCount += outcomes.filter((outcome) => outcome === "unavailable").length;
    failedCount += outcomes.filter((outcome) => outcome === "failed").length;

    // 이번 배치가 8건 미만이었다면 대기열에 남은 작업이 없으므로 종료
    if (jobs.length < batchLimit) break;
  }

  return {
    claimed: totalClaimed,
    ready: readyCount,
    unavailable: unavailableCount,
    failed: failedCount,
  };
}
