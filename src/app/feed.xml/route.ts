import { listArticles } from "@/lib/data/articles";

export const runtime = "edge";
export const preferredRegion = "global";
// listArticles가 내부적으로 60초 캐시(getCachedArticleFeed)를 쓰므로 여기서도 같은 주기로 맞춘다.
export const revalidate = 60;

const SITE_URL = "https://magisa.vercel.app";
const SITE_TITLE = "Magisa — 테크 블로그 아카이버";
const SITE_DESCRIPTION = "구독한 테크 블로그의 새 글을 모아 보는 아카이버";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 매기사가 모은 글을 남들도 자기 RSS 리더로 구독할 수 있게 하는 공개 피드.
 * 개인 열람용 read_status는 로그인/방문자별로 다르므로 여기서는 항상 비로그인(null) 기준 —
 * 전체 글 목록(최신 200개)을 그대로 노출한다.
 */
export async function GET() {
  const articles = await listArticles(null);

  const items = articles
    .map((article) => {
      const sourceLabel = article.source?.title ?? article.source?.site_url ?? "";
      const description = [sourceLabel, article.excerpt].filter(Boolean).join(" — ");
      const pubDate = article.published_at ? new Date(article.published_at).toUTCString() : undefined;

      return [
        "<item>",
        `<title>${escapeXml(article.title)}</title>`,
        `<link>${escapeXml(article.url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(article.url)}</guid>`,
        description ? `<description>${escapeXml(description)}</description>` : "",
        pubDate ? `<pubDate>${pubDate}</pubDate>` : "",
        "</item>",
      ]
        .filter(Boolean)
        .join("");
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0"><channel>` +
    `<title>${escapeXml(SITE_TITLE)}</title>` +
    `<link>${SITE_URL}</link>` +
    `<description>${escapeXml(SITE_DESCRIPTION)}</description>` +
    `<language>ko</language>` +
    items +
    `</channel></rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
