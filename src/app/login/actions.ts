"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { migrateVisitorDataToUser } from "@/lib/data/articles";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

type OAuthProvider = "google";

// 로그인 전 익명 방문자 쿠키로 쌓아둔 읽음/즐겨찾기 기록을 최초 로그인 시 이 계정으로 옮긴다
// (docs/decisions.md 참고). 방문자 쿠키가 없으면(이미 옮겨졌거나 애초에 없던 경우) 아무 일도 안 한다.
async function migrateVisitorDataIfNeeded(userId: string): Promise<void> {
  const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value;
  if (!visitorId) return;
  await migrateVisitorDataToUser(visitorId, userId);
}

// Vercel(프리뷰 배포 포함)과 로컬 개발 모두에서 정확한 절대 URL을 만들기 위해 실제 요청 헤더에서
// origin을 구성한다 — 하드코딩된 프로덕션 도메인 대신 이 방식을 쓰면 프리뷰 배포에서도 그대로 동작한다.
async function getOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

export async function signInWithProviderAction(provider: OAuthProvider, next: string, _formData: FormData) {
  const origin = await getOrigin();
  const callbackUrl = new URL("/auth/callback", origin);
  if (next) callbackUrl.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "로그인을 시작하지 못했어요")}`);
  }
  redirect(data.url);
}

export async function signUpAction(formData: FormData) {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!nickname || !email || !password) {
    redirect("/login?error=닉네임, 이메일, 비밀번호를 입력해주세요");
  }
  if (password !== passwordConfirm) {
    redirect("/login?error=비밀번호가 서로 일치하지 않아요");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nickname } } });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  if (data.user) {
    await migrateVisitorDataIfNeeded(data.user.id);
  }
  redirect(next);
}

export async function signInWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) {
    redirect("/login?error=이메일과 비밀번호를 입력해주세요");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  if (data.user) {
    await migrateVisitorDataIfNeeded(data.user.id);
  }
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
