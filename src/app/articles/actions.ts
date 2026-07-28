"use server";

import { revalidatePath } from "next/cache";
import { markArticleRead, markArticleUnread } from "@/lib/data/articles";

export async function markArticleReadAction(articleId: string) {
  if (!articleId) return;
  await markArticleRead(articleId);
  revalidatePath("/");
}

export async function markArticleUnreadAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await markArticleUnread(id);
  revalidatePath("/");
}
