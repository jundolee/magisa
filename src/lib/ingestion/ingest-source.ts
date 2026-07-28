import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFeed } from "./parse-feed";
import { scrapeSource } from "./scrape-source";
import type { FeedType, NormalizedArticle, ScrapeConfig } from "./types";

export interface SourceRow {
  id: string;
  site_url: string;
  feed_url: string | null;
  feed_type: FeedType;
  scrape_config: ScrapeConfig | null;
}

export async function fetchArticlesForSource(source: SourceRow): Promise<NormalizedArticle[]> {
  if ((source.feed_type === "rss" || source.feed_type === "atom") && source.feed_url) {
    return parseFeed(source.feed_url);
  }
  if (source.feed_type === "scrape" && source.scrape_config) {
    return scrapeSource(source.site_url, source.scrape_config);
  }
  throw new Error(`소스(${source.id})의 수집 방식을 결정할 수 없습니다 (feed_type=${source.feed_type})`);
}

/**
 * 소스 하나를 수집해 articles 테이블에 upsert한다.
 * unique(source_id, dedup_key) 제약 + ignoreDuplicates로 중복 재삽입을 막는다 (architecture.md 3절 "중복 방지").
 */
export async function ingestSource(
  supabase: SupabaseClient,
  source: SourceRow
): Promise<{ found: number; inserted: number }> {
  const articles = await fetchArticlesForSource(source);
  if (articles.length === 0) {
    return { found: 0, inserted: 0 };
  }

  const rows = articles.map((a) => ({
    source_id: source.id,
    title: a.title,
    url: a.url,
    excerpt: a.excerpt,
    thumbnail_url: a.thumbnailUrl,
    published_at: a.publishedAt,
    dedup_key: a.dedupKey,
  }));

  const { data, error } = await supabase
    .from("articles")
    .upsert(rows, { onConflict: "source_id,dedup_key", ignoreDuplicates: true })
    .select("id");

  if (error) {
    throw error;
  }

  return { found: articles.length, inserted: data?.length ?? 0 };
}
