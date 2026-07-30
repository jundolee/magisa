import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, sha256Hex } from "@/lib/admin-auth";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

/**
 * /sources(소스 관리)는 누구나 글을 추가/삭제/일시중지할 수 있으면 안 되는 관리자 전용 화면.
 * Supabase Auth 같은 전체 로그인 시스템 대신, 이 화면 하나만 막는 가벼운 비밀번호 게이트.
 * Next.js 16부터 middleware.ts가 proxy.ts로 이름이 바뀌었다 (docs/decisions.md 참고).
 */
async function guardSourcesAdmin(request: NextRequest): Promise<NextResponse> {
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

/**
 * 읽음/안읽음을 로그인 없이 브라우저별로 구분하기 위해, 처음 방문한 브라우저에 익명 visitor_id 쿠키를 부여한다.
 * 완전히 처음 온 방문자는 항상 안읽음 상태에서 시작한다 (기존 전역 읽음 기록은 이어받지 않음).
 */
function assignVisitorId(request: NextRequest): NextResponse {
  if (request.cookies.get(VISITOR_COOKIE_NAME)?.value) {
    return NextResponse.next();
  }

  const visitorId = crypto.randomUUID();

  // 같은 요청의 RSC 렌더링에서도 바로 이 방문자로 인식되도록 요청 쿠키 헤더 자체에도 반영한다.
  const requestHeaders = new Headers(request.headers);
  const existingCookieHeader = request.headers.get("cookie");
  requestHeaders.set(
    "cookie",
    existingCookieHeader
      ? `${existingCookieHeader}; ${VISITOR_COOKIE_NAME}=${visitorId}`
      : `${VISITOR_COOKIE_NAME}=${visitorId}`
  );

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 2, // 2년
    path: "/",
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/sources" || pathname.startsWith("/sources/")) {
    return guardSourcesAdmin(request);
  }

  return assignVisitorId(request);
}

export const config = {
  matcher: ["/", "/sources", "/sources/:path*"],
};
