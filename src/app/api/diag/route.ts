// 임시 진단 라우트. 확인 후 삭제할 것 (medium.com 접근 관련 이슈 확인용).
import { discoverFeed } from "@/lib/ingestion/discover-feed";

export const runtime = "nodejs";

export async function GET() {
  const directFetch = await fetch("https://medium.com/daangn", {
    headers: { "User-Agent": "MagisaBot/0.1 (+personal tech blog aggregator)" },
  })
    .then(async (res) => ({ status: res.status, length: (await res.text()).length }))
    .catch((e) => ({ error: String(e) }));

  const discovery = await discoverFeed("https://medium.com/daangn").catch((e) => ({ error: String(e) }));

  return Response.json({ directFetch, discovery });
}
