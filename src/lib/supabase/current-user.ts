import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "./server";

/**
 * 같은 요청(렌더) 안에서 여러 컴포넌트(헤더의 로그인 상태, 글 목록의 읽음/즐겨찾기 등)가 각자
 * getUser()를 부르면 Supabase Auth 서버 왕복이 그만큼 중복 발생한다 — React의 요청 범위 캐시로
 * 한 요청당 한 번만 실제로 호출되게 한다.
 * 세션 쿠키(sb-*-auth-token)가 아예 없는 비로그인 방문자는 Supabase Auth 클라이언트 초기화 및
 * 서버 왕복 없이 즉시 null을 반환해 첫 접속 로딩 지연을 원천 방지한다.
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (!hasAuthCookie) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

