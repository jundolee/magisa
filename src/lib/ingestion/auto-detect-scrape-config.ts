import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { ScrapeConfig } from "./types";

const USER_AGENT = "MagisaBot/0.1 (+personal tech blog aggregator)";
const FETCH_TIMEOUT_MS = 15_000;
const MIN_REPEAT = 3;
const MAX_REPEAT = 200;

interface Group {
  tag: string;
  className: string;
  els: Element[];
}

function classTokens($el: cheerio.Cheerio<Element>): string[] {
  return ($el.attr("class") ?? "").trim().split(/\s+/).filter(Boolean);
}

/**
 * RSS가 없는 사이트의 글 목록 구조를 휴리스틱으로 추론한다.
 * 정확한 결과를 보장하지 않으며, 반드시 addSourceFlowAction의 미리보기 단계와 함께 써서
 * 사용자가 실제 추출 결과를 눈으로 확인한 뒤 등록하도록 한다 (docs/decisions.md 참고).
 */
export async function autoDetectScrapeConfig(siteUrl: string): Promise<ScrapeConfig | null> {
  const res = await fetch(siteUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const $ = cheerio.load(await res.text());

  // 1. (태그, 첫 클래스) 기준으로 반복되는 엘리먼트를 그룹핑한다.
  const groups = new Map<string, Group>();
  $("body *").each((_, el) => {
    const $el = $(el);
    const tokens = classTokens($el);
    if (tokens.length === 0) return;
    const tag = el.tagName.toLowerCase();
    const className = tokens[0];
    const key = `${tag}.${className}`;
    const group = groups.get(key) ?? { tag, className, els: [] };
    group.els.push(el);
    groups.set(key, group);
  });

  // 2. 진짜 "글 목록"일 가능성이 높은 그룹만 남긴다.
  // 실제 페이지에는 같은 클래스를 가진 빈 중복 엘리먼트(숨김 레이아웃 변형 등)가 섞여 있는 경우가 많아서,
  // 그룹 전체 개수 대비 비율이 아니라 "링크+텍스트를 모두 갖춘" 엘리먼트의 절대 개수 기준으로 평가한다.
  let best: Group | null = null;
  let bestQualifyingEls: Element[] = [];
  let bestScore = 0;

  for (const group of groups.values()) {
    const { els } = group;
    if (els.length < MIN_REPEAT || els.length > MAX_REPEAT) continue;

    const qualifying: { el: Element; href: string; text: string }[] = [];
    for (const el of els) {
      const $el = $(el);
      const linkEl = el.tagName.toLowerCase() === "a" ? $el : $el.find("a").first();
      const href = linkEl.attr("href");
      const text = $el.text().trim();
      if (href && text.length >= 8) qualifying.push({ el, href, text });
    }

    if (qualifying.length < MIN_REPEAT) continue;

    // 서로 다른 글을 가리켜야 함 (같은 카테고리/태그 링크가 반복되는 내비게이션 요소 배제)
    const distinctHrefs = new Set(qualifying.map((q) => q.href)).size;
    if (distinctHrefs < qualifying.length * 0.8) continue;

    // 텍스트도 서로 달라야 함 — 태그 pill처럼 소수 값이 반복되는 패턴(href는 다양해도 텍스트는 몇 개 안 됨)을 배제
    const distinctTexts = new Set(qualifying.map((q) => q.text)).size;
    if (distinctTexts < qualifying.length * 0.8) continue;

    if (qualifying.length > bestScore) {
      bestScore = qualifying.length;
      best = group;
      bestQualifyingEls = qualifying.map((q) => q.el);
    }
  }

  if (!best) return null;

  const $sample = $(bestQualifyingEls[0]);
  const listItemSelector = `${best.tag}.${best.className}`;
  const isSelfLink = best.tag === "a";

  const titleSelector = findByKeywordOrTag($sample, ["title", "subject", "heading"], ["h1", "h2", "h3", "h4"]);
  const excerptSelector = findByKeywordOrTag($sample, ["desc", "excerpt", "summary", "content"], []);
  const dateSelector = findByKeywordOrTag($sample, ["date", "time"], ["time"]);
  const thumbnailSelector = $sample.find("img").length > 0 ? "img" : undefined;

  if (!titleSelector) return null; // 제목을 못 찾으면 신뢰할 수 없는 추론이므로 포기

  return {
    listItemSelector,
    titleSelector,
    linkSelector: isSelfLink ? undefined : "a",
    excerptSelector,
    dateSelector,
    thumbnailSelector,
  };
}

function findByKeywordOrTag(
  $sample: cheerio.Cheerio<Element>,
  keywords: string[],
  fallbackTags: string[]
): string | undefined {
  const descendants = $sample.find("*").toArray();

  // 문서 순서상 부모가 자식보다 먼저 나오므로, 마지막으로 매칭된(=가장 안쪽) 엘리먼트를 택한다.
  // 예: `...__description`(제목+설명을 함께 감싸는 바깥 wrapper)과 `...__description__description`(설명 텍스트만)이
  // 둘 다 "desc"에 매칭될 때, 더 구체적인 안쪽 엘리먼트를 우선한다.
  let lastMatch: string | undefined;
  for (const el of descendants) {
    const classAttr = el.attribs?.class ?? "";
    const lower = classAttr.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw))) {
      const firstToken = classAttr.trim().split(/\s+/)[0];
      if (firstToken) lastMatch = `.${firstToken}`;
    }
  }
  if (lastMatch) return lastMatch;

  for (const tag of fallbackTags) {
    if ($sample.find(tag).length > 0) return tag;
  }

  return undefined;
}
