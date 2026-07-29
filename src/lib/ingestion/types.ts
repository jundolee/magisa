export type FeedType = "rss" | "atom" | "scrape" | "unknown";

export interface ScrapeConfig {
  listItemSelector: string;
  titleSelector: string;
  // 생략 시 listItemSelector로 잡힌 엘리먼트 자체를 링크로 사용 (카드 전체가 <a>인 경우)
  linkSelector?: string;
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
  siteTitle: string | null;
}
