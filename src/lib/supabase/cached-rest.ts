import "server-only";

/**
 * 홈 화면의 무거운 조회(글 목록/소스 목록)를 supabase-js 대신 PostgREST에 직접 fetch()로 붙여서
 * Next.js의 fetch 캐시(force-cache + next.revalidate/tags)를 타게 한다. `unstable_cache`는 edge
 * 런타임에서 여러 인스턴스에 걸쳐 캐시가 공유되지 않는 게 실측으로 확인됐지만(docs/decisions.md
 * 2026-08-19 참고), fetch 캐시는 Vercel의 전역 Data Cache와 연동되도록 설계된 1차 캐싱 수단이라
 * edge에서도 인스턴스와 무관하게 재사용될 것으로 기대된다. 이 함수는 오직 이 목적(읽기 전용,
 * 캐시 가능한 GET 조회)에만 쓴다 — 쓰기/트랜잭션이 필요한 나머지 코드는 그대로 supabase-js
 * service role 클라이언트(`./service`)를 쓴다.
 */
export async function fetchCachedFromSupabase<T>(
  table: string,
  params: Record<string, string>,
  cache: { revalidate: number; tags: string[] }
): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다. .env.example을 참고해 .env.local을 만드세요."
    );
  }

  const query = new URLSearchParams(params);
  const res = await fetch(`${url}/rest/v1/${table}?${query.toString()}`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "force-cache",
    next: { revalidate: cache.revalidate, tags: cache.tags },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase REST 조회 실패(${res.status} ${table}): ${body}`);
  }

  return res.json() as Promise<T>;
}
