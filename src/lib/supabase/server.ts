import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * 로그인한 사용자 본인 세션으로 동작하는 클라이언트 (Server Component/Server Action/Route Handler 전용).
 * 수집/관리 작업에 쓰는 service role 클라이언트(`@/lib/supabase/service`)와는 별개 — 이건 "지금 로그인한
 * 사람이 누구인지"만 확인하는 용도이고, 실제 DB 읽기/쓰기는 여전히 서비스 롤로 수행한다(기존 아키텍처 유지).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component에서 호출되면 쿠키 쓰기가 무시된다 — proxy.ts의 세션 갱신이 대신 처리한다
          // (Supabase SSR 공식 패턴).
        }
      },
    },
  });
}
