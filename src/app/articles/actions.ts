"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  incrementArticleClickCount,
  markAllArticlesRead,
  markAllArticlesUnread,
  markArticleRead,
  markArticleUnread,
  setArticleFavorite,
} from "@/lib/data/articles";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

async function getVisitorId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VISITOR_COOKIE_NAME)?.value ?? null;
}

export async function markArticleReadAction(articleId: string) {
  if (!articleId) return;
  const visitorId = await getVisitorId();

  // 클릭수 집계와 읽음 처리는 서로 독립적인 값이라 하나가 실패해도 다른 하나는 반영돼야 한다 —
  // 예전엔 순차로 await해서 클릭수 RPC가 실패하면(일시적 오류 등) 읽음 처리까지 통째로 건너뛰던 버그가 있었음.
  const results = await Promise.allSettled([
    incrementArticleClickCount(articleId),
    // proxy.ts가 쿠키를 못 내려준 드문 경우 — 읽음 처리만 건너뛰고 클릭수 반영은 그대로 진행
    visitorId ? markArticleRead(visitorId, articleId) : Promise.resolve(),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("markArticleReadAction 부분 실패:", result.reason);
    }
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

export async function toggleArticleFavoriteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextFavorite = formData.get("nextFavorite") === "true";
  if (!id) return;
  const visitorId = await getVisitorId();
  if (!visitorId) return;
  await setArticleFavorite(visitorId, id, nextFavorite);
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
