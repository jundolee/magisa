// 임시 진단 라우트. 확인 후 삭제할 것 — UA 통일 후 medium.com 재검증용.
import { discoverFeed } from "@/lib/ingestion/discover-feed";
import { parseFeed } from "@/lib/ingestion/parse-feed";

export async function GET() {
  const discovery = await discoverFeed("https://medium.com/daangn").catch((e) => ({ error: String(e) }));
  let articleCount: number | null = null;
  if ("feedUrl" in discovery && discovery.feedUrl) {
    const feed = await parseFeed(discovery.feedUrl).catch(() => null);
    articleCount = feed?.articles.length ?? null;
  }
  return Response.json({ discovery, articleCount });
}
