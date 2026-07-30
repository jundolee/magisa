"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { markArticleRead, markArticleUnread } from "@/lib/data/articles";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

async function getVisitorId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VISITOR_COOKIE_NAME)?.value ?? null;
}

export async function markArticleReadAction(articleId: string) {
  if (!articleId) return;
  const visitorId = await getVisitorId();
  if (!visitorId) return; // proxy.ts가 쿠키를 못 내려준 드문 경우 — 조용히 무시
  await markArticleRead(visitorId, articleId);
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
