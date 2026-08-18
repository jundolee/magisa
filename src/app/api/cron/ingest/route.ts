import { NextRequest, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestSource, type SourceRow } from "@/lib/ingestion/ingest-source";

// rss-parser/cheerio는 Node API가 필요해 edge 런타임에서 동작하지 않는다.
export const runtime = "nodejs";
// 크론에서만 호출되므로 캐시하지 않는다.
export const dynamic = "force-dynamic";
export const maxDuration = 60;
// 원래는 배치 하나 처리 후 매번 next/server의 after()로 자신을 다시 호출해 다음 배치를 잇는
// self-chaining 구조였는데, 실제 운영 크론(Vercel Cron이 직접 트리거하는 실행)에서 반복적으로
// 첫 배치만 처리하고 체인이 조용히 끊기는 문제가 재발했다(docs/decisions.md 2026-08-18 참고).
// 같은 코드를 curl로 수동 호출하면 매번 끝까지 정상적으로 이어졌던 것으로 보아 after()/waitUntil
// 자체가 문제라기보다, Vercel Cron이 트리거한 실행에서 응답 전송 후 백그라운드 연산(after())이
// 이어지는 것을 신뢰할 수 없다는 뜻으로 판단(Vercel 커뮤니티에도 waitUntil이 재시도 없이 프로덕션에서
// 간헐적으로 끊긴다는 알려진 한계로 언급됨). 그래서 "한 번의 실행이 배치 하나만 처리하고 다음 배치는
// 별도 백그라운드 호출에 맡긴다"는 구조를 버리고, 이 실행 하나가 시간 예산(TIME_BUDGET_MS) 안에서
// while 루프로 여러 배치를 순차적으로(await) 전부 처리한다 — 소스 수가 지금 규모(30여 개)면 보통
// 하루치 수집은 이 안에서 전부 끝난다. 그래도 밀린 소스가 아주 많아 시간 예산을 넘기면, 그때만
// after()로 다음 실행을 잇는다(완전히 없애지는 않되 일상적 경로에서 의존하지 않도록 예외 상황 전용
// 폴백으로 격하).
const TIME_BUDGET_MS = 50_000;
// 체이닝이 무한 반복되지 않도록 하는 안전장치 — 현재 소스 수(30여개)면 5~6홉이면 충분하지만,
// last_checked_at 갱신이 어떤 이유로든 안 되는 버그가 생겨도 여기서 반드시 멈추도록 여유 있게 잡음.
const MAX_CHAIN_HOPS = 15;

interface SourceIngestSummary {
  sourceId: string;
  siteUrl: string;
  ok: boolean;
  found?: number;
  inserted?: number;
  error?: string;
}

// 소스마다 서로 다른 사이트를 두드리는 독립적인 작업이라 동시에 처리해도 안전하다 — 한 번에 이만큼씩
// 묶어 처리해 총 소요시간을 줄인다(순서대로 하나씩 처리하면 소스가 늘어날수록 실행시간 제한에 걸림,
// docs/decisions.md 참고). 너무 크게 잡으면 외부 사이트에 순간적으로 많은 요청이 몰릴 수 있어
// 적당한 수로 제한한다.
const CONCURRENCY = 6;
// 소스 하나가 오랫동안 확인 안 돼 새 글이 잔뜩 쌓여있으면(예: 첫 등록, 오랜 장애 복구 후) 병렬화해도
// 그 소스 혼자서 배치 전체의 60초 예산을 넘길 수 있다(docs/decisions.md 2026-08-14 참고). 소스별로
// 상한을 둬서, 넘기면 이번 홉은 포기하고(last_checked_at은 갱신해 다음 차례로 넘김 — 같은 소스가
// 계속 앞자리를 차지해 배치를 막는 걸 방지) 나머지 소스와 다음 홉은 정상 진행되게 한다.
const SOURCE_TIMEOUT_MS = 40_000;

async function ingestOne(
  supabase: ReturnType<typeof createServiceClient>,
  source: SourceRow
): Promise<SourceIngestSummary> {
  const checkedAt = new Date().toISOString();
  try {
    const result = await Promise.race([
      ingestSource(supabase, source),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`시간 초과(${SOURCE_TIMEOUT_MS / 1000}초)`)), SOURCE_TIMEOUT_MS)
      ),
    ]);
    await supabase
      .from("sources")
      .update({ last_checked_at: checkedAt, last_success_at: checkedAt, last_error: null })
      .eq("id", source.id);
    return { sourceId: source.id, siteUrl: source.site_url, ok: true, ...result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("sources").update({ last_checked_at: checkedAt, last_error: message }).eq("id", source.id);
    return { sourceId: source.id, siteUrl: source.site_url, ok: false, error: message };
  }
}

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const hop = Number(url.searchParams.get("hop") ?? "0");
  const processedBeforeThisHop = Number(url.searchParams.get("processed") ?? "0");

  const supabase = createServiceClient();
  const startedAt = Date.now();
  const allSummaries: SourceIngestSummary[] = [];
  // 마지막으로 가져온 배치 크기 — CONCURRENCY와 같으면 "더 남아있을 가능성 있음", 그보다 작으면
  // "전부 처리 완료"를 뜻한다. 시작 전이므로 CONCURRENCY로 초기화해 최소 한 번은 루프를 돈다.
  let lastBatchSize = CONCURRENCY;

  while (lastBatchSize === CONCURRENCY && Date.now() - startedAt < TIME_BUDGET_MS) {
    // ORDER BY 없이 조회하면 Postgres가 매번 다른 순서로 행을 돌려줄 수 있어, 실행시간 제한에 걸려
    // 일부만 처리하고 끝나는 회차마다 "이번엔 어느 소스가 밀렸는지"가 무작위로 바뀌는 문제가 있었다
    // (docs/decisions.md 참고). 가장 오래 확인 안 된 소스부터 한 배치(CONCURRENCY개)만 가져온다 —
    // 처리한 소스는 last_checked_at이 갱신돼 뒤로 밀려나므로, 다음 루프가 다시 같은 조건으로
    // 조회하면 자연히 그다음 배치가 나온다.
    const { data: sources, error } = await supabase
      .from("sources")
      .select("id, site_url, feed_url, feed_type, scrape_config")
      .eq("is_active", true)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(CONCURRENCY);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    const batch = (sources ?? []) as SourceRow[];
    lastBatchSize = batch.length;
    if (batch.length === 0) break;

    const summaries = await Promise.all(batch.map((source) => ingestOne(supabase, source)));
    allSummaries.push(...summaries);
  }

  const processedSoFar = processedBeforeThisHop + allSummaries.length;
  // 루프가 시간 예산을 넘겨서(그리고 마지막 배치가 꽉 차서, 즉 아직 남았을 가능성이 있어서) 중간에
  // 끊겼다면 다음 실행에 나머지를 넘긴다. 정상적인 하루치 규모(소스 30여 개)에서는 이 루프 안에서
  // 전부 끝나 이 분기를 타지 않는다 — after() 기반 체이닝은 밀린 소스가 아주 많을 때만 쓰이는
  // 예외 상황 폴백으로 남겨둔 것.
  const chained = lastBatchSize === CONCURRENCY && hop + 1 < MAX_CHAIN_HOPS;
  if (chained) {
    const nextUrl = new URL(request.url);
    nextUrl.searchParams.set("hop", String(hop + 1));
    nextUrl.searchParams.set("processed", String(processedSoFar));
    after(async () => {
      await fetch(nextUrl.toString(), {
        headers: { authorization: `Bearer ${expected}` },
      }).catch(() => {});
    });
  }

  return Response.json({
    ok: true,
    hop,
    processedThisHop: allSummaries.length,
    processedSoFar,
    chained,
    succeeded: allSummaries.filter((s) => s.ok).length,
    summaries: allSummaries,
  });
}
