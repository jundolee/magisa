import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE_NAME, sha256Hex } from "@/lib/admin-auth";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

/**
 * ADMIN_EMAILS에 등록된 이메일로 로그인된 상태인지 확인한다. Supabase 세션 쿠키가 아예 없으면
 * (로그인 안 한 방문자) Auth 서버 왕복 없이 바로 false — /sources 방문자 대부분이 이 경로다.
 */
async function getAllowedAdminEmail(request: NextRequest): Promise<string | null> {
  const hasSupabaseSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasSupabaseSessionCookie) return null;

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {}, // 게이트 확인용 읽기 전용 — 토큰 갱신은 다른 경로(assignVisitorIdAndRefreshSession)가 담당
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

/**
 * /sources(소스 관리)는 누구나 글을 추가/삭제/일시중지할 수 있으면 안 되는 관리자 전용 화면.
 * Next.js 16부터 middleware.ts가 proxy.ts로 이름이 바뀌었다 (docs/decisions.md 참고).
 * ADMIN_EMAILS(쉼표로 구분된 이메일 목록)가 설정돼 있으면 Supabase Auth 로그인 계정의 이메일이
 * 그 목록에 있는지로 판단한다 — 별도 비밀번호 없이 평소 로그인 계정으로 접근 가능
 * (2026-08-14 결정, docs/decisions.md 참고). ADMIN_EMAILS가 없으면(전환 전/로컬 개발) 기존
 * 비밀번호 게이트로 폴백한다.
 */
async function guardSourcesAdmin(request: NextRequest): Promise<NextResponse> {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length > 0) {
    const email = await getAllowedAdminEmail(request);
    if (email && adminEmails.includes(email.toLowerCase())) {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

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
  //
  // 단, 이 호출은 페이지 렌더링(스트리밍)이 시작되기 전에 끝나야 하는 미들웨어라 Supabase Auth
  // 서버 왕복 시간만큼 첫 응답 자체가 늦어진다 — 로그인 세션 쿠키가 아예 없는 비로그인 방문자에게는
  // 갱신할 게 없어 이 왕복이 통째로 낭비이므로, Supabase 세션 쿠키(`sb-*-auth-token*`)가 있을 때만
  // 호출한다("URL 입력 후 한참 있다 한꺼번에 뜬다"는 문제의 원인이었음).
  const hasSupabaseSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (hasSupabaseSessionCookie) {
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
  }

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
