import Parser from "rss-parser";
import * as cheerio from "cheerio";
import type { NormalizedArticle } from "./types";
import { computeDedupKey } from "./dedup";
import { INGESTION_USER_AGENT } from "./user-agent";

// d2.naver.com/d2.atom처럼 Accept 헤더가 없으면 406(Not Acceptable)으로 거부하는 서버가 있어
// (discoverFeed의 fetchText는 Accept:*/*를 이미 보내 문제없이 통과했지만, rss-parser 기본값에는
// 없었음) 명시적으로 지정해 같은 문제를 피한다 (docs/decisions.md 참고).
const parser = new Parser({
  timeout: 10_000,
  headers: {
    "User-Agent": INGESTION_USER_AGENT,
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
});

function resolveUrl(raw: string, base: string): string | null {
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

/**
 * 많은 피드가 enclosure/media:content 없이 본문(content:encoded)에만 이미지를 담아둔다
 * (toss.tech, Medium 기반 피드 등에서 확인됨 — docs/decisions.md 참고).
 * 그래서 표준 필드 다음으로, 본문 HTML의 첫 <img> 태그를 폴백으로 사용한다.
 * Gatsby 등 일부 사이트는 이 <img src>가 도메인 없는 상대경로라(예: oliveyoung.tech),
 * 글 URL을 기준으로 절대 URL로 변환해야 우리 사이트에서 깨지지 않는다.
 */
function extractThumbnail(item: Record<string, unknown>, articleUrl: string): string | null {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && enclosure.type?.startsWith("image")) {
    return resolveUrl(enclosure.url, articleUrl);
  }
  const mediaContent = item["media:content"] as { $?: { url?: string } } | undefined;
  if (mediaContent?.$?.url) return resolveUrl(mediaContent.$.url, articleUrl);
  const mediaThumbnail = item["media:thumbnail"] as { $?: { url?: string } } | undefined;
  if (mediaThumbnail?.$?.url) return resolveUrl(mediaThumbnail.$.url, articleUrl);

  // rss-parser는 item.content를 <description>에 매핑하고, 실제 본문 HTML은 원래 태그명인
  // "content:encoded"로 남겨둔다 (둘 다 없으면 content로 폴백).
  const content = (item["content:encoded"] as string | undefined) ?? (item.content as string | undefined);
  if (content) {
    const $ = cheerio.load(content);
    const imgSrc = $("img").first().attr("src");
    if (imgSrc) return resolveUrl(imgSrc, articleUrl);
    const preloadHref = $('link[rel="preload"][as="image"]').first().attr("href");
    if (preloadHref) return resolveUrl(preloadHref, articleUrl);
  }

  return null;
}

export interface ParsedFeed {
  /** 채널(피드) 제목 — 소스 등록 시 블로그 이름으로 사용 */
  title: string | null;
  articles: NormalizedArticle[];
}

/**
 * RSS/Atom 피드 URL을 받아 목록 메타데이터로 정규화한다. architecture.md 3절 "RSS/Atom 파싱" 참고.
 */
export async function parseFeed(feedUrl: string): Promise<ParsedFeed> {
  const feed = await parser.parseURL(feedUrl);

  const articles = (feed.items ?? [])
    .filter((item) => item.link && item.title)
    .map((item) => {
      const url = item.link as string;
      const title = item.title as string;
      const publishedAt = item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : null);
      const excerpt = item.contentSnippet ?? null;
      const guid = (item.guid as string | undefined) ?? (item as Record<string, unknown>).id;

      return {
        title,
        url,
        excerpt: excerpt ? excerpt.slice(0, 500) : null,
        thumbnailUrl: extractThumbnail(item as Record<string, unknown>, url),
        publishedAt: publishedAt ?? null,
        dedupKey: computeDedupKey({ guid: (guid as string) ?? null, url, title }),
      } satisfies NormalizedArticle;
    });

  return { title: feed.title?.trim() || null, articles };
}
