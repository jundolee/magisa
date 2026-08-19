import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE_NAME, sha256Hex } from "@/lib/admin-auth";

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

export async function proxy(request: NextRequest) {
  return guardSourcesAdmin(request);
}

export const config = {
  matcher: ["/sources", "/sources/:path*"],
};

