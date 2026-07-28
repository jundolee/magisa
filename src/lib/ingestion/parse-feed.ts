import Parser from "rss-parser";
import type { NormalizedArticle } from "./types";
import { computeDedupKey } from "./dedup";

const parser = new Parser({
  timeout: 10_000,
  headers: { "User-Agent": "MagisaBot/0.1 (+personal tech blog aggregator)" },
});

// rss-parser의 기본 타입은 media:content/media:thumbnail 같은 확장 필드를 포함하지 않아 any로 접근한다.
function extractThumbnail(item: Record<string, unknown>): string | null {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && enclosure.type?.startsWith("image")) {
    return enclosure.url;
  }
  const mediaContent = item["media:content"] as { $?: { url?: string } } | undefined;
  if (mediaContent?.$?.url) return mediaContent.$.url;
  const mediaThumbnail = item["media:thumbnail"] as { $?: { url?: string } } | undefined;
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;
  return null;
}

/**
 * RSS/Atom 피드 URL을 받아 목록 메타데이터로 정규화한다. architecture.md 3절 "RSS/Atom 파싱" 참고.
 */
export async function parseFeed(feedUrl: string): Promise<NormalizedArticle[]> {
  const feed = await parser.parseURL(feedUrl);

  return (feed.items ?? [])
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
        thumbnailUrl: extractThumbnail(item as Record<string, unknown>),
        publishedAt: publishedAt ?? null,
        dedupKey: computeDedupKey({ guid: (guid as string) ?? null, url, title }),
      } satisfies NormalizedArticle;
    });
}
