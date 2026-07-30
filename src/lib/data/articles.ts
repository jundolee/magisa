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
    favicon_url: string | null;
  } | null;
}

export type ArticleFilter = "all" | "unread" | "read";

/**
 * 항상 전체를 한 번에 불러온다 — 읽음/소스 필터는 클라이언트(ArticleList)에서 즉시 적용한다.
 * 탭을 바꿀 때마다 서버를 다시 왕복하면 Supabase 지연이 매번 그대로 드러나서 느리게 느껴졌기 때문
 * (docs/decisions.md 참고).
 * 읽음 여부는 전역 컬럼이 아니라 `read_status`(visitor_id, article_id) 테이블 기준 — 방문자(브라우저)별로 구분된다.
 */
export async function listArticles(visitorId: string | null): Promise<ArticleListItem[]> {
  const supabase = createServiceClient();

  const [articlesRes, readRes] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, url, excerpt, thumbnail_url, published_at, source:sources(id, title, site_url, favicon_url)")
      // 카드에 보이는 날짜(published_at) 기준 내림차순 — 화면에 표시되는 값과 정렬 순서가 어긋나지 않도록 한다.
      // published_at이 없는 경우만 맨 뒤로 보낸다.
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(200),
    visitorId
      ? supabase.from("read_status").select("article_id").eq("visitor_id", visitorId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (articlesRes.error) throw articlesRes.error;
  if (readRes.error) throw readRes.error;

  const readIds = new Set((readRes.data ?? []).map((r) => r.article_id as string));
  const articles = (articlesRes.data as unknown as Omit<ArticleListItem, "is_read">[]) ?? [];
  return articles.map((a) => ({ ...a, is_read: readIds.has(a.id) }));
}

export async function markArticleRead(visitorId: string, articleId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("read_status")
    .upsert({ visitor_id: visitorId, article_id: articleId }, { onConflict: "visitor_id,article_id" });
  if (error) throw error;
}

export async function markArticleUnread(visitorId: string, articleId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("read_status")
    .delete()
    .eq("visitor_id", visitorId)
    .eq("article_id", articleId);
  if (error) throw error;
}
