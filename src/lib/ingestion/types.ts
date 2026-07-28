export type FeedType = "rss" | "atom" | "scrape" | "unknown";

export interface ScrapeConfig {
  listItemSelector: string;
  titleSelector: string;
  linkSelector: string;
  linkAttr?: string; // 생략 시 href 속성 사용
  excerptSelector?: string;
  dateSelector?: string;
  thumbnailSelector?: string;
  thumbnailAttr?: string; // 생략 시 src 속성 사용
}

export interface NormalizedArticle {
  title: string;
  url: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null; // ISO string
  dedupKey: string;
}

export interface FeedDiscoveryResult {
  feedUrl: string | null;
  feedType: FeedType;
}
