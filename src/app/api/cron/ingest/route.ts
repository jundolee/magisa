import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestSource, type SourceRow } from "@/lib/ingestion/ingest-source";

// rss-parser/cheerio는 Node API가 필요해 edge 런타임에서 동작하지 않는다.
export const runtime = "nodejs";
// 크론에서만 호출되므로 캐시하지 않는다.
export const dynamic = "force-dynamic";
// 소스를 한 번에 하나씩 순차 처리하다 보니(소스당 fetch+AI 호출+썸네일 업로드 등으로 평균 10초 이상)
// 소스가 늘어날수록 Vercel의 기본 실행시간 제한에 걸려 뒷부분 소스들이 조용히(에러 기록도 없이)
// 처리되지 않고 남는 문제가 실제로 있었음(docs/decisions.md 참고) — Hobby 플랜에서 허용하는
// 최대치로 명시 지정해 여유를 최대한 확보한다. 아래 동시 처리(CONCURRENCY)로 총 소요시간 자체도 줄인다.
export const maxDuration = 60;

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

async function ingestOne(
  supabase: ReturnType<typeof createServiceClient>,
  source: SourceRow
): Promise<SourceIngestSummary> {
  const checkedAt = new Date().toISOString();
  try {
    const result = await ingestSource(supabase, source);
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

  const supabase = createServiceClient();
  // ORDER BY 없이 조회하면 Postgres가 매번 다른 순서로 행을 돌려줄 수 있어, 실행시간 제한에 걸려
  // 일부만 처리하고 끝나는 회차마다 "이번엔 어느 소스가 밀렸는지"가 무작위로 바뀌는 문제가 있었다
  // (docs/decisions.md 참고). 가장 오래 확인 안 된 소스부터 처리해, 혹시 이번에도 시간이 부족해서
  // 다 못 끝내더라도 매번 가장 밀린 소스가 우선 처리되도록 한다.
  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, site_url, feed_url, feed_type, scrape_config")
    .eq("is_active", true)
    .order("last_checked_at", { ascending: true, nullsFirst: true });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const summaries: SourceIngestSummary[] = [];
  const queue = (sources ?? []) as SourceRow[];
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((source) => ingestOne(supabase, source)));
    summaries.push(...results);
  }

  return Response.json({
    ok: true,
    total: summaries.length,
    succeeded: summaries.filter((s) => s.ok).length,
    summaries,
  });
}
