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
    // 소스마다 원문 발행일 신뢰도가 달라(스크래핑은 URL 슬러그 추정치인 경우도 있음) 정렬은
    // 항상 채워지는 discovered_at(우리 시스템이 수집한 시각) 기준으로 한다. docs/decisions.md 참고.
    .order("discovered_at", { ascending: false })
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
