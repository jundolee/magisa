"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  incrementArticleClickCount,
  markAllArticlesRead,
  markAllArticlesUnread,
  markArticleRead,
  markArticleUnread,
} from "@/lib/data/articles";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

async function getVisitorId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VISITOR_COOKIE_NAME)?.value ?? null;
}

export async function markArticleReadAction(articleId: string) {
  if (!articleId) return;
  // 클릭수는 방문자 구분 없이 전역으로 집계되는 값이라 쿠키 여부와 무관하게 항상 증가시킨다.
  await incrementArticleClickCount(articleId);

  const visitorId = await getVisitorId();
  // proxy.ts가 쿠키를 못 내려준 드문 경우 — 읽음 처리만 건너뛰고 클릭수 반영은 그대로 진행
  if (visitorId) {
    await markArticleRead(visitorId, articleId);
  }
  revalidatePath("/");
}

export async function markArticleUnreadAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const visitorId = await getVisitorId();
  if (!visitorId) return;
  await markArticleUnread(visitorId, id);
  revalidatePath("/");
}

export async function markAllArticlesReadAction() {
  const visitorId = await getVisitorId();
  if (!visitorId) return;
  await markAllArticlesRead(visitorId);
  revalidatePath("/");
}

export async function markAllArticlesUnreadAction() {
  const visitorId = await getVisitorId();
  if (!visitorId) return;
  await markAllArticlesUnread(visitorId);
  revalidatePath("/");
}
