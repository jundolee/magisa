"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  incrementArticleClickCount,
  listArticles,
  markAllArticlesRead,
  markAllArticlesUnread,
  markArticleRead,
  markArticleUnread,
  searchArticles,
  setArticleFavorite,
  type ArticleListItem,
} from "@/lib/data/articles";
import { getCurrentUser } from "@/lib/supabase/current-user";

async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

// 즐겨찾기/전체 읽음 처리처럼 사용자가 명시적으로 누르는 상호작용은 로그인이 필요하다 — 현재 페이지로
// 되돌아올 수 있도록 referer를 next로 실어 로그인 화면으로 보낸다 (docs/decisions.md 참고).
async function redirectToLogin(): Promise<never> {
  const referer = (await headers()).get("referer");
  const next = referer ? new URL(referer).pathname + new URL(referer).search : "/";
  redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function markArticleReadAction(articleId: string) {
  if (!articleId) return;
  const userId = await getCurrentUserId();

  // 클릭수 집계와 읽음 처리는 서로 독립적인 값이라 하나가 실패해도 다른 하나는 반영돼야 한다 —
  // 예전엔 순차로 await해서 클릭수 RPC가 실패하면(일시적 오류 등) 읽음 처리까지 통째로 건너뛰던 버그가 있었음.
  // 읽음 처리는 열람(누구나 자유)에 곁들여지는 부수 효과라, 로그인 안 한 사람은 로그인으로 보내는 대신
  // (링크를 새 탭에서 여는 도중 원래 탭이 로그인 화면으로 튀는 건 나쁜 경험) 그냥 조용히 건너뛴다.
  const results = await Promise.allSettled([
    incrementArticleClickCount(articleId),
    userId ? markArticleRead(userId, articleId) : Promise.resolve(),
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
  const userId = await getCurrentUserId();
  if (!userId) return redirectToLogin();
  await markArticleUnread(userId, id);
  revalidatePath("/");
}

export async function toggleArticleFavoriteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextFavorite = formData.get("nextFavorite") === "true";
  if (!id) return;
  const userId = await getCurrentUserId();
  if (!userId) return redirectToLogin();
  await setArticleFavorite(userId, id, nextFavorite);
  revalidatePath("/");
}

export async function markAllArticlesReadAction() {
  const userId = await getCurrentUserId();
  if (!userId) return redirectToLogin();
  await markAllArticlesRead(userId);
  revalidatePath("/");
}

export async function markAllArticlesUnreadAction() {
  const userId = await getCurrentUserId();
  if (!userId) return redirectToLogin();
  await markAllArticlesUnread(userId);
  revalidatePath("/");
}

/**
 * 검색어가 바뀔 때 클라이언트(ArticleList)에서 직접 호출한다 — 예전엔 router.replace로 페이지
 * 전체를 다시 요청해서 스켈레톤이 재노출되고 검색과 무관한 listSources()까지 매번 다시 조회됐는데,
 * 서버 액션으로 이 데이터만 받아와 클라이언트 상태를 갈아끼우는 방식으로 바꿔 그 왕복을 없앤다.
 * page.tsx의 초기 렌더 분기(검색어 유무에 따라 searchArticles/listArticles)와 동일한 로직을 공유.
 */
export async function loadArticlesAction(query: string): Promise<ArticleListItem[]> {
  const userId = await getCurrentUserId();
  const trimmed = query.trim();
  return trimmed ? searchArticles(trimmed, userId) : listArticles(userId);
}
