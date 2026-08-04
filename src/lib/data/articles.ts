import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export interface ArticleListItem {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  click_count: number;
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
 * 글 목록(articles + source 조인)은 방문자와 무관하게 모두에게 동일하다 — 크론 수집 주기에 맞춰
 * 60초 정도 캐시해도 체감 지연이 없고, 매 요청마다 Supabase를 왕복하지 않아 초기 로딩이 빨라진다
 * (docs/decisions.md 참고). 방문자별 읽음 여부(read_status)만 이 캐시 밖에서 매번 가볍게 조회해 합친다.
 */
const getCachedArticleFeed = unstable_cache(
  async (): Promise<Omit<ArticleListItem, "is_read">[]> => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("articles")
      .select(
        "id, title, url, excerpt, thumbnail_url, published_at, click_count, source:sources(id, title, site_url, favicon_url)"
      )
      // 카드에 보이는 날짜(published_at) 기준 내림차순 — 화면에 표시되는 값과 정렬 순서가 어긋나지 않도록 한다.
      // published_at이 없는 경우만 맨 뒤로 보낸다.
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw error;
    return (data as unknown as Omit<ArticleListItem, "is_read">[]) ?? [];
  },
  ["article-feed"],
  { revalidate: 60 }
);

/**
 * 항상 전체를 한 번에 불러온다 — 읽음/소스 필터는 클라이언트(ArticleList)에서 즉시 적용한다.
 * 탭을 바꿀 때마다 서버를 다시 왕복하면 Supabase 지연이 매번 그대로 드러나서 느리게 느껴졌기 때문
 * (docs/decisions.md 참고).
 * 읽음 여부는 전역 컬럼이 아니라 `read_status`(visitor_id, article_id) 테이블 기준 — 방문자(브라우저)별로 구분된다.
 */
export async function listArticles(visitorId: string | null): Promise<ArticleListItem[]> {
  const supabase = createServiceClient();
  const articles = await getCachedArticleFeed();

  // read_status 전체를 방문자 기준으로만 조회하면(.eq("visitor_id", ...)) PostgREST 기본 1000행 제한에
  // 걸릴 수 있다 — 방문자가 오래 쓸수록 누적 행이 늘어나 결국 최신 글이 응답에서 잘려나가 안읽음으로
  // 보이는 버그가 있었음. 화면에 보이는 글(최대 200개)의 article_id로만 좁혀서 조회해 항상 1000행 미만이
  // 되도록 한다.
  const readRes =
    visitorId && articles.length > 0
      ? await supabase
          .from("read_status")
          .select("article_id")
          .eq("visitor_id", visitorId)
          .in(
            "article_id",
            articles.map((a) => a.id)
          )
      : { data: [], error: null };

  if (readRes.error) throw readRes.error;

  const readIds = new Set((readRes.data ?? []).map((r) => r.article_id as string));
  return articles.map((a) => ({ ...a, is_read: readIds.has(a.id) }));
}

// 방문자 구분 없이 모든 유저에게 공통으로 보이는 전역 카운터라 read_status와 달리 articles 테이블에 그대로 둔다.
// 동시 클릭에도 안전하도록 "column + 1" 원자적 증가를 DB 함수(RPC)로 처리한다.
export async function incrementArticleClickCount(articleId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("increment_article_click_count", { target_id: articleId });
  if (error) throw error;
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

export async function markAllArticlesRead(visitorId: string): Promise<void> {
  const supabase = createServiceClient();

  // .select("id")는 PostgREST 기본 1000행 제한에 걸려 전체 글이 1000개를 넘으면 일부만 읽음
  // 처리되던 버그가 있었음 — range()로 페이지를 넘겨가며 전체 id를 다 모은다.
  const PAGE_SIZE = 1000;
  const articleIds: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("articles")
      .select("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    articleIds.push(...data.map((a) => a.id));
    if (data.length < PAGE_SIZE) break;
  }
  if (articleIds.length === 0) return;

  const { error } = await supabase
    .from("read_status")
    .upsert(
      articleIds.map((id) => ({ visitor_id: visitorId, article_id: id })),
      { onConflict: "visitor_id,article_id" }
    );
  if (error) throw error;
}

export async function markAllArticlesUnread(visitorId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("read_status").delete().eq("visitor_id", visitorId);
  if (error) throw error;
}
