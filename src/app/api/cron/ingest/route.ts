import { NextRequest, after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestSource, type SourceRow } from "@/lib/ingestion/ingest-source";

// rss-parser/cheerio는 Node API가 필요해 edge 런타임에서 동작하지 않는다.
export const runtime = "nodejs";
// 크론에서만 호출되므로 캐시하지 않는다.
export const dynamic = "force-dynamic";
// 배치 6개(CONCURRENCY)를 동시 처리해도 소스당 fetch+AI 호출+썸네일 업로드로 배치 하나에
// 40~50초가 걸릴 수 있어(docs/decisions.md 2026-08-13 참고), 소스 수가 늘어나면 여전히 한 번의
// 실행(maxDuration=60, Hobby 플랜 허용 최대치) 안에서는 1~2배치밖에 못 끝낸다. 그래서 이 라우트는
// 매 실행마다 딱 한 배치만 처리하고, 남은 소스가 있으면 아래 after()로 스스로를 다시 호출해
// 다음 배치를 잇는 방식(self-chaining)으로 전체 소스를 여러 번의 60초 이내 실행에 나눠 끝낸다.
export const maxDuration = 60;
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
  // ORDER BY 없이 조회하면 Postgres가 매번 다른 순서로 행을 돌려줄 수 있어, 실행시간 제한에 걸려
  // 일부만 처리하고 끝나는 회차마다 "이번엔 어느 소스가 밀렸는지"가 무작위로 바뀌는 문제가 있었다
  // (docs/decisions.md 참고). 가장 오래 확인 안 된 소스부터 한 배치(CONCURRENCY개)만 가져온다 —
  // 처리한 소스는 last_checked_at이 갱신돼 뒤로 밀려나므로, 다음 홉이 다시 같은 조건으로 조회하면
  // 자연히 그다음 배치가 나온다.
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
  const summaries = await Promise.all(batch.map((source) => ingestOne(supabase, source)));
  const processedSoFar = processedBeforeThisHop + summaries.length;

  // 배치가 CONCURRENCY만큼 꽉 찼다면 아직 처리 안 된 소스가 남아있을 가능성이 있다는 뜻이라 다음
  // 홉을 이어서 트리거한다. after()로 응답을 먼저 클라이언트에 반환한 뒤 백그라운드에서 다음 홉을
  // 호출한다 — 이 fetch를 짧은 타임아웃으로 강제 중단하면 안 된다: 로컬 검증 중 5초 abort를 걸었더니
  // 다음 홉의 처리 시간이 5초 근처(또는 초과)일 때 응답 전송이 중간에 끊겨, 그 홉 자신의 after()(=
  // 그다음다음 홉을 잇는 코드)가 아예 실행되지 않고 체인이 조용히 끊기는 현상이 실제로 재현됨. 그냥
  // 끝까지 await하면 다음 홉이 응답을 정상적으로 마칠 때까지 기다리게 되는데, 그동안 이 실행(부모)
  // 자체는 maxDuration을 넘기면 플랫폼이 강제 종료하지만, 이미 전송된 다음 홉 요청은 Vercel에서
  // 완전히 독립된 새 실행이라 부모가 죽어도 계속 자기 몫의 60초 안에서 처리가 이어진다.
  if (batch.length === CONCURRENCY && hop + 1 < MAX_CHAIN_HOPS) {
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
    processedThisHop: summaries.length,
    processedSoFar,
    chained: batch.length === CONCURRENCY && hop + 1 < MAX_CHAIN_HOPS,
    succeeded: summaries.filter((s) => s.ok).length,
    summaries,
  });
}
