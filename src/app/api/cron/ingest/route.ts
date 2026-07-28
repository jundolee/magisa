import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestSource, type SourceRow } from "@/lib/ingestion/ingest-source";

// rss-parser/cheerio는 Node API가 필요해 edge 런타임에서 동작하지 않는다.
export const runtime = "nodejs";
// 크론에서만 호출되므로 캐시하지 않는다.
export const dynamic = "force-dynamic";

interface SourceIngestSummary {
  sourceId: string;
  siteUrl: string;
  ok: boolean;
  found?: number;
  inserted?: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, site_url, feed_url, feed_type, scrape_config")
    .eq("is_active", true);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const summaries: SourceIngestSummary[] = [];

  for (const source of (sources ?? []) as SourceRow[]) {
    const checkedAt = new Date().toISOString();
    try {
      const result = await ingestSource(supabase, source);
      await supabase
        .from("sources")
        .update({ last_checked_at: checkedAt, last_success_at: checkedAt, last_error: null })
        .eq("id", source.id);
      summaries.push({ sourceId: source.id, siteUrl: source.site_url, ok: true, ...result });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await supabase
        .from("sources")
        .update({ last_checked_at: checkedAt, last_error: message })
        .eq("id", source.id);
      summaries.push({ sourceId: source.id, siteUrl: source.site_url, ok: false, error: message });
    }
  }

  return Response.json({
    ok: true,
    total: summaries.length,
    succeeded: summaries.filter((s) => s.ok).length,
    summaries,
  });
}
