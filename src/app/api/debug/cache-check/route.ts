import { unstable_cache } from "next/cache";

// 임시 진단 라우트 — 홈 화면(edge 런타임)에서 unstable_cache(revalidate:60)가 실제로
// 요청 간 재사용되는지 확인하기 위함. 검증 끝나면 삭제 예정 (docs/decisions.md 참고).
export const runtime = "edge";
export const dynamic = "force-dynamic";

const getCachedValue = unstable_cache(
  async () => ({ generatedAt: new Date().toISOString(), random: Math.random() }),
  ["debug-cache-check"],
  { revalidate: 60 }
);

export async function GET() {
  const value = await getCachedValue();
  return Response.json(value);
}
