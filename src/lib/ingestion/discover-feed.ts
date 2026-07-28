import * as cheerio from "cheerio";
import type { FeedDiscoveryResult, FeedType } from "./types";

const USER_AGENT = "MagisaBot/0.1 (+personal tech blog aggregator)";
const FETCH_TIMEOUT_MS = 10_000;
const CANDIDATE_PATHS = [
  "/feed",
  "/feed/",
  "/rss.xml",
  "/rss",
  "/atom.xml",
  "/index.xml", // Hugo
  "/feeds/posts/default", // Blogger
];

async function fetchText(url: string): Promise<{ contentType: string; text: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return { contentType: res.headers.get("content-type") ?? "", text: await res.text() };
  } catch {
    return null;
  }
}

function detectFeedType(contentType: string, text: string): FeedType | null {
  const sample = text.slice(0, 2000);
  const looksXml =
    contentType.includes("xml") ||
    sample.trimStart().startsWith("<?xml") ||
    /<(rss|feed)[\s>]/i.test(sample);
  if (!looksXml) return null;
  if (/<rss[\s>]/i.test(sample)) return "rss";
  if (/<feed[\s>]/i.test(sample)) return "atom";
  return null;
}

/**
 * 블로그 홈 URL을 받아 RSS/Atom 피드를 자동 탐지한다.
 * architecture.md 3절 "피드 자동 탐지" 참고: <link rel=alternate> 우선, 없으면 관례적 경로 순차 프로브.
 */
export async function discoverFeed(siteUrl: string): Promise<FeedDiscoveryResult> {
  const homepage = await fetchText(siteUrl);

  if (homepage) {
    const $ = cheerio.load(homepage.text);
    const linkHref = $(
      'link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]'
    )
      .first()
      .attr("href");

    if (linkHref) {
      const absoluteUrl = new URL(linkHref, siteUrl).toString();
      const candidate = await fetchText(absoluteUrl);
      const feedType = candidate && detectFeedType(candidate.contentType, candidate.text);
      if (feedType) {
        return { feedUrl: absoluteUrl, feedType };
      }
    }
  }

  for (const path of CANDIDATE_PATHS) {
    const candidateUrl = new URL(path, siteUrl).toString();
    const candidate = await fetchText(candidateUrl);
    if (!candidate) continue;
    const feedType = detectFeedType(candidate.contentType, candidate.text);
    if (feedType) {
      return { feedUrl: candidateUrl, feedType };
    }
  }

  return { feedUrl: null, feedType: "unknown" };
}
