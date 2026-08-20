import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFeed } from "./parse-feed";
import { scrapeSource } from "./scrape-source";
import { canonicalizeUrl } from "./dedup";
import { fetchOgImage } from "./fetch-og-image";
import { mirrorThumbnail } from "@/lib/storage/thumbnails";
import { classifyArticlesBatch } from "./category-classifier";
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
 * 소스 하나를 수집해 articles 테이블에 삽입한다.
 * 두 종류의 중복을 모두 막는다 (docs/decisions.md 참고):
 *  - unique(source_id, dedup_key): 같은 소스를 재수집할 때 같은 글이 다시 쌓이는 것 방지
 *  - unique(canonical_url): 서로 다른 소스(예: 원본 블로그 + 큐레이션 사이트)가 같은 글을 가리킬 때 중복 방지
 * 두 제약 중 하나라도 걸리면(23505) 실패로 보지 않고 "중복으로 건너뜀"으로 처리한다.
 *
 * 글마다 og:image 조회(최대 5초)와 썸네일 미러링(최대 15초)이 붙는데, 예전엔 이걸 글 하나씩
 * 순차 처리했다 — 새 글이 많은 소스 하나가 배치(hop) 안에 섞이면 그 소스만으로 크론의 60초
 * 제한(maxDuration)을 넘겨 FUNCTION_INVOCATION_TIMEOUT으로 통째로 죽고, 그러면 다음 홉을 잇는
 * after() 콜백 자체가 실행될 기회조차 없어 self-chaining이 조용히 끊기는 문제가 있었다(실제
 * 배포본에서 504로 재현·확인, docs/decisions.md 2026-08-14 참고). 소스 간 병렬 처리와 같은
 * 이유로(서로 다른 사이트를 두드리는 독립적인 작업) 글 단위 후처리도 Promise.all로 병렬화한다.
 */
export async function ingestSource(
  supabase: SupabaseClient,
  source: SourceRow
): Promise<{ found: number; inserted: number; duplicates: number }> {
  const articles = await fetchArticlesForSource(source);
  if (articles.length === 0) {
    return { found: 0, inserted: 0, duplicates: 0 };
  }

  const insertResults = await Promise.all(
    articles.map(async (a, index) => {
      let canonicalUrl: string;
      try {
        canonicalUrl = canonicalizeUrl(a.url);
      } catch {
        canonicalUrl = a.url;
      }

      // RSS 필드/thumbnailSelector로 못 찾았을 때만 원문 페이지의 og:image를 한 번 더 시도한다 —
      // 소스마다 thumbnailSelector를 신경 쓰지 않아도 대부분의 사이트가 공유하는 메타 태그로 커버된다.
      const thumbnailUrl = a.thumbnailUrl ?? (await fetchOgImage(a.url));

      // category/tags는 DB 기본값('general'/'{}')으로 두고, 새로 삽입된 글만 아래에서 분류해 채운다.
      const { data: insertedRow, error } = await supabase
        .from("articles")
        .insert({
          source_id: source.id,
          title: a.title,
          url: a.url,
          canonical_url: canonicalUrl,
          excerpt: a.excerpt,
          thumbnail_url: thumbnailUrl,
          published_at: a.publishedAt,
          dedup_key: a.dedupKey,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === POSTGRES_UNIQUE_VIOLATION) {
          return { duplicate: true as const };
        }
        throw error;
      }
      return { duplicate: false as const, articleId: insertedRow.id, thumbnailUrl, index };
    })
  );

  const newlyInserted = insertResults.filter(
    (r): r is { duplicate: false; articleId: string; thumbnailUrl: string | null; index: number } => !r.duplicate
  );
  const duplicates = insertResults.length - newlyInserted.length;

  // 새로 들어온 글만(중복 제외) (1) 썸네일을 우리 스토리지로 미러링하고 (2) AI로 카테고리/태그를
  // 분류한다 — 둘 다 새 글에만 필요한 후처리이고 서로 독립적이라 병렬로 진행한다.
  // 2026-08-20 결정: 원래는 매 실행마다 feed 전체(대부분 이미 저장된 중복)를 다시 분류해서 소스당
  // 최대 AI_TIMEOUT_MS(20초)가 삽입 전에 그대로 더해졌음 — 중복 글의 분류 결과는 애초에 insert가
  // 23505로 버려지면서 한 번도 저장되지 않는 완전한 낭비였고, 이 지연이 크론의 소스별 시간 상한과
  // 겹쳐 타임아웃의 실제 원인 중 하나였다(docs/decisions.md 참고). 새 글만 대상으로 하면 평소(중복만
  // 있는 날)엔 이 블록이 API 호출 없이 즉시 끝난다.
  await Promise.all([
    Promise.all(
      newlyInserted
        .filter((r) => r.thumbnailUrl)
        .map(async (r) => {
          const mirroredUrl = await mirrorThumbnail(supabase, r.thumbnailUrl!, r.articleId);
          if (mirroredUrl) {
            await supabase.from("articles").update({ thumbnail_url: mirroredUrl }).eq("id", r.articleId);
          }
        })
    ),
    (async () => {
      if (newlyInserted.length === 0) return;
      const classifications = await classifyArticlesBatch(
        newlyInserted.map((r) => ({ title: articles[r.index].title, excerpt: articles[r.index].excerpt }))
      );
      await Promise.all(
        newlyInserted.map((r, i) => {
          const classification = classifications[i];
          if (!classification) return null;
          return supabase
            .from("articles")
            .update({ category: classification.category, tags: classification.tags })
            .eq("id", r.articleId);
        })
      );
    })(),
  ]);

  return { found: articles.length, inserted: newlyInserted.length, duplicates };
}
