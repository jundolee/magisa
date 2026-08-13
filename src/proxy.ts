import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE_NAME, sha256Hex } from "@/lib/admin-auth";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

/**
 * /sources(소스 관리)는 누구나 글을 추가/삭제/일시중지할 수 있으면 안 되는 관리자 전용 화면.
 * Supabase Auth 같은 전체 로그인 시스템 대신, 이 화면 하나만 막는 가벼운 비밀번호 게이트.
 * Next.js 16부터 middleware.ts가 proxy.ts로 이름이 바뀌었다 (docs/decisions.md 참고).
 * (OAuth 로그인이 자리 잡으면 이 게이트는 관리자 이메일 허용목록 방식으로 교체될 예정 — docs/decisions.md)
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
 * 방문자 쿠키 부여(로그인 없이도 열람은 자유)와 Supabase Auth 세션 갱신을 한 응답 위에 함께 쌓는다.
 * 두 로직 모두 "같은 요청의 RSC 렌더링에서 바로 인식돼야 한다"는 같은 이유로 요청 헤더의 쿠키까지
 * 직접 조작해야 해서, 각자 독립적으로 NextResponse를 만들면 서로의 쿠키를 덮어써버린다 — 하나의
 * mutable 요청 헤더/응답 쌍을 공유하며 순서대로 누적하는 방식으로 합쳤다.
 */
async function assignVisitorIdAndRefreshSession(request: NextRequest): Promise<NextResponse> {
  const requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  function setRequestCookie(name: string, value: string) {
    const existing = requestHeaders.get("cookie");
    requestHeaders.set("cookie", existing ? `${existing}; ${name}=${value}` : `${name}=${value}`);
  }

  // 완전히 처음 온 방문자는 항상 안읽음 상태에서 시작한다 (기존 전역 읽음 기록은 이어받지 않음).
  if (!request.cookies.get(VISITOR_COOKIE_NAME)?.value) {
    const visitorId = crypto.randomUUID();
    setRequestCookie(VISITOR_COOKIE_NAME, visitorId);
    response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 2, // 2년
      path: "/",
    });
  }

  // Server Component는 쿠키를 직접 못 써서 만료 임박 세션을 스스로 갱신할 수 없다 — 여기서 미리
  // getUser()를 호출해 필요하면 토큰을 갱신하고 그 결과를 응답 쿠키에 실어 보낸다(Supabase SSR 공식 패턴).
  // getSession()이 아니라 getUser()를 쓰는 이유: 전자는 로컬 JWT를 검증 없이 그대로 믿지만, 후자는
  // Supabase Auth 서버에 다시 확인한다.
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => setRequestCookie(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/sources" || pathname.startsWith("/sources/")) {
    return guardSourcesAdmin(request);
  }

  return assignVisitorIdAndRefreshSession(request);
}

export const config = {
  matcher: ["/", "/login", "/sources", "/sources/:path*"],
};
