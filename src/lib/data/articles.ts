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

/**
 * 항상 전체를 한 번에 불러온다 — 읽음/소스 필터는 클라이언트(ArticleList)에서 즉시 적용한다.
 * 탭을 바꿀 때마다 서버를 다시 왕복하면 Supabase 지연이 매번 그대로 드러나서 느리게 느껴졌기 때문
 * (docs/decisions.md 참고).
 */
export async function listArticles(): Promise<ArticleListItem[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, excerpt, thumbnail_url, published_at, is_read, source:sources(id, title, site_url)")
    // 카드에 보이는 날짜(published_at) 기준 내림차순 — 화면에 표시되는 값과 정렬 순서가 어긋나지 않도록 한다.
    // published_at이 없는 경우만 맨 뒤로 보낸다.
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(200);

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
