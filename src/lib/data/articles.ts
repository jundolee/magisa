import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export interface ArticleListItem {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  is_read: boolean;
  source: {
    id: string;
    title: string | null;
    site_url: string;
  } | null;
}

export type ArticleFilter = "all" | "unread" | "read";

export async function listArticles(options?: { filter?: ArticleFilter }): Promise<ArticleListItem[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("articles")
    .select("id, title, url, excerpt, thumbnail_url, published_at, is_read, source:sources(id, title, site_url)")
    // 카드에 보이는 날짜(published_at) 기준 내림차순 — 화면에 표시되는 값과 정렬 순서가 어긋나지 않도록 한다.
    // published_at이 없는 경우만 맨 뒤로 보낸다.
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (options?.filter === "unread") {
    query = query.eq("is_read", false);
  } else if (options?.filter === "read") {
    query = query.eq("is_read", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as ArticleListItem[]) ?? [];
}

export async function countUnreadArticles(): Promise<number> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markArticleRead(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("articles")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markArticleUnread(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("articles").update({ is_read: false, read_at: null }).eq("id", id);
  if (error) throw error;
}
