import { createServiceClient } from "../src/lib/supabase/service";
import { ARTICLE_SUMMARY_PROMPT_VERSION, isArticleSummaryEnabled } from "../src/lib/ingestion/article-summary";
import { runSummaryJobs } from "../src/lib/ingestion/run-summary-jobs";

async function main() {
  console.log("=== AI 요약 실패/미제공 작업 복구 및 재처리 시작 ===");
  const client = createServiceClient();

  // 1. 현재 프롬프트 버전의 상태별 현황 조회
  const { data: currentJobs, error: fetchErr } = await client
    .from("article_summary_jobs")
    .select("status, error_code")
    .eq("prompt_version", ARTICLE_SUMMARY_PROMPT_VERSION);

  if (fetchErr) {
    console.error("작업 현황 조회 실패:", fetchErr.message);
    process.exit(1);
  }

  const counts: Record<string, number> = {};
  for (const job of currentJobs ?? []) {
    counts[job.status] = (counts[job.status] ?? 0) + 1;
  }
  console.log("현재 작업 상태 분포:", counts);

  // 2. unavailable 또는 failed 상태인 작업들을 pending으로 복구
  const { data: updated, error: updateErr } = await client
    .from("article_summary_jobs")
    .update({
      status: "pending",
      attempt_count: 0,
      lease_until: null,
      retry_after: null,
      error_code: null,
      updated_at: new Date().toISOString(),
    })
    .eq("prompt_version", ARTICLE_SUMMARY_PROMPT_VERSION)
    .in("status", ["unavailable", "failed"])
    .select("article_id");

  if (updateErr) {
    console.error("작업 상태 복구 실패:", updateErr.message);
    process.exit(1);
  }

  const resetCount = updated?.length ?? 0;
  console.log(`총 ${resetCount}건의 작업을 'pending' 상태로 복구했습니다.`);

  // 3. AI 요약이 활성화되어 있으면 즉시 배치 처리 실행
  if (isArticleSummaryEnabled()) {
    console.log("AI 요약 워커 실행 중...");
    const result = await runSummaryJobs(32);
    console.log("워커 실행 결과:", result);
  } else {
    console.log("OPENAI_SUMMARY_ENABLED가 비활성화되어 있으므로, 복구된 작업은 다음 cron 또는 ingest 실행 시 처리됩니다.");
  }
  console.log("=== 복구 작업 완료 ===");
}

main().catch((err) => {
  console.error("에러 발생:", err);
  process.exit(1);
});
