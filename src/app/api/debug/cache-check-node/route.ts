import { unstable_cache } from "next/cache";

// 임시 진단 라우트 — nodejs 런타임에서는 unstable_cache가 정상 재사용되는지 비교하기 위한 대조군.
// 검증 끝나면 삭제 예정 (docs/decisions.md 참고).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getCachedValue = unstable_cache(
  async () => ({ generatedAt: new Date().toISOString(), random: Math.random() }),
  ["debug-cache-check-node"],
  { revalidate: 60 }
);

export async function GET() {
  const value = await getCachedValue();
  return Response.json(value);
}
