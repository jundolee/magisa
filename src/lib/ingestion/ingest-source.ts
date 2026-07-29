import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFeed } from "./parse-feed";
import { scrapeSource } from "./scrape-source";
import { canonicalizeUrl } from "./dedup";
import { mirrorThumbnail } from "@/lib/storage/thumbnails";
import type { FeedType, NormalizedArticle, ScrapeConfig } from "./types";

const POSTGRES_UNIQUE_VIOLATION = "23505";

export interface SourceRow {
  id: string;
  site_url: string;
  feed_url: string | null;
  feed_type: FeedType;
  scrape_config: ScrapeConfig | null;
}

export async function fetchArticlesForSource(source: SourceRow): Promise<NormalizedArticle[]> {
  if ((source.feed_type === "rss" || source.feed_type === "atom") && source.feed_url) {
    return (await parseFeed(source.feed_url)).articles;
  }
  if (source.feed_type === "scrape" && source.scrape_config) {
    return scrapeSource(source.site_url, source.scrape_config);
  }
  throw new Error(`소스(${source.id})의 수집 방식을 결정할 수 없습니다 (feed_type=${source.feed_type})`);
}

/**
 * 소스 하나를 수집해 articles 테이블에 한 건씩 삽입한다.
 * 두 종류의 중복을 모두 막는다 (docs/decisions.md 참고):
 *  - unique(source_id, dedup_key): 같은 소스를 재수집할 때 같은 글이 다시 쌓이는 것 방지
 *  - unique(canonical_url): 서로 다른 소스(예: 원본 블로그 + 큐레이션 사이트)가 같은 글을 가리킬 때 중복 방지
 * 두 제약 중 하나라도 걸리면(23505) 실패로 보지 않고 "중복으로 건너뜀"으로 처리한다.
 */
export async function ingestSource(
  supabase: SupabaseClient,
  source: SourceRow
): Promise<{ found: number; inserted: number; duplicates: number }> {
  const articles = await fetchArticlesForSource(source);
  if (articles.length === 0) {
    return { found: 0, inserted: 0, duplicates: 0 };
  }

  let inserted = 0;
  let duplicates = 0;

  for (const a of articles) {
    let canonicalUrl: string;
    try {
      canonicalUrl = canonicalizeUrl(a.url);
    } catch {
      canonicalUrl = a.url;
    }

    const { data: insertedRow, error } = await supabase
      .from("articles")
      .insert({
        source_id: source.id,
        title: a.title,
        url: a.url,
        canonical_url: canonicalUrl,
        excerpt: a.excerpt,
        thumbnail_url: a.thumbnailUrl,
        published_at: a.publishedAt,
        dedup_key: a.dedupKey,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        duplicates += 1;
        continue;
      }
      throw error;
    }
    inserted += 1;

    // 새로 들어온 글일 때만(중복이면 여기 안 옴) 썸네일을 우리 스토리지로 미러링한다 —
    // presigned URL처럼 만료되는 원본 이미지를 영구 URL로 바꿔둔다 (docs/decisions.md 참고).
    if (a.thumbnailUrl && insertedRow) {
      const mirroredUrl = await mirrorThumbnail(supabase, a.thumbnailUrl, insertedRow.id);
      if (mirroredUrl) {
        await supabase.from("articles").update({ thumbnail_url: mirroredUrl }).eq("id", insertedRow.id);
      }
    }
  }

  return { found: articles.length, inserted, duplicates };
}
