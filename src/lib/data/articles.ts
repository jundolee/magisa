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

export async function listArticles(options?: { onlyUnread?: boolean }): Promise<ArticleListItem[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("articles")
    .select("id, title, url, excerpt, thumbnail_url, published_at, is_read, source:sources(id, title, site_url)")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (options?.onlyUnread) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as ArticleListItem[]) ?? [];
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
