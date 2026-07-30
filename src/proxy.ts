import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, sha256Hex } from "@/lib/admin-auth";

/**
 * /sources(소스 관리)는 누구나 글을 추가/삭제/일시중지할 수 있으면 안 되는 관리자 전용 화면.
 * Supabase Auth 같은 전체 로그인 시스템 대신, 이 화면 하나만 막는 가벼운 비밀번호 게이트.
 * Next.js 16부터 middleware.ts가 proxy.ts로 이름이 바뀌었다 (docs/decisions.md 참고).
 */
export async function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // 비밀번호를 설정하지 않았으면(로컬 개발 등) 막지 않는다.
    return NextResponse.next();
  }

  const expected = await sha256Hex(password);
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookie === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin-login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/sources", "/sources/:path*"],
};
