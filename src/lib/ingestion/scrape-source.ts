import * as cheerio from "cheerio";
import type { NormalizedArticle, ScrapeConfig } from "./types";
import { computeDedupKey } from "./dedup";

const USER_AGENT = "MagisaBot/0.1 (+personal tech blog aggregator)";
const FETCH_TIMEOUT_MS = 15_000;

function normalizeDate(dateText: string): string | null {
  const parsed = new Date(dateText);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function resolveUrl(raw: string, base: string): string | null {
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

/**
 * RSS가 없는 사이트를 위한 CSS 셀렉터 기반 정적 HTML 스크래핑.
 * architecture.md 3절 "스크래핑 폴백" 참고 — JS 렌더링(CSR) 사이트는 지원하지 않는다 (docs/decisions.md 참고).
 */
export async function scrapeSource(siteUrl: string, config: ScrapeConfig): Promise<NormalizedArticle[]> {
  const res = await fetch(siteUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`스크래핑 대상 페이지 요청 실패: ${res.status} ${siteUrl}`);
  }

  const $ = cheerio.load(await res.text());
  const articles: NormalizedArticle[] = [];

  $(config.listItemSelector).each((_, el) => {
    const $el = $(el);
    const title = $el.find(config.titleSelector).first().text().trim();

    const linkEl = $el.find(config.linkSelector).first();
    const linkAttr = config.linkAttr ?? "href";
    const rawLink = linkAttr === "text" ? linkEl.text().trim() : linkEl.attr(linkAttr);
    if (!title || !rawLink) return;

    const url = resolveUrl(rawLink, siteUrl);
    if (!url) return;

    const excerpt = config.excerptSelector
      ? $el.find(config.excerptSelector).first().text().trim() || null
      : null;

    let publishedAt: string | null = null;
    if (config.dateSelector) {
      const dateEl = $el.find(config.dateSelector).first();
      const dateText = dateEl.attr("datetime") ?? dateEl.text().trim();
      publishedAt = dateText ? normalizeDate(dateText) : null;
    }

    let thumbnailUrl: string | null = null;
    if (config.thumbnailSelector) {
      const thumbAttr = config.thumbnailAttr ?? "src";
      const rawThumb = $el.find(config.thumbnailSelector).first().attr(thumbAttr);
      thumbnailUrl = rawThumb ? resolveUrl(rawThumb, siteUrl) : null;
    }

    articles.push({
      title,
      url,
      excerpt: excerpt ? excerpt.slice(0, 500) : null,
      thumbnailUrl,
      publishedAt,
      dedupKey: computeDedupKey({ url, title }),
    });
  });

  return articles;
}
