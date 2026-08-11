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
  // 일반 UA로는 빈 SPA 셸만 내려주고 검색엔진 크롤러 UA에는 미리 렌더링된 HTML을 주는 사이트용 —
  // true면 매 수집(등록 미리보기·일일 크론 모두)에 BOT_USER_AGENT를 사용한다 (docs/decisions.md 참고).
  useBotUserAgent?: boolean;
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
  faviconUrl: string;
}
