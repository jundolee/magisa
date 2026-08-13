import "server-only";
import { cache } from "react";
import { createClient } from "./server";

/**
 * 같은 요청(렌더) 안에서 여러 컴포넌트(헤더의 로그인 상태, 글 목록의 읽음/즐겨찾기 등)가 각자
 * getUser()를 부르면 Supabase Auth 서버 왕복이 그만큼 중복 발생한다 — React의 요청 범위 캐시로
 * 한 요청당 한 번만 실제로 호출되게 한다.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
