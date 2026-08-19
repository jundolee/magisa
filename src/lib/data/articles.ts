import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCachedFromSupabase } from "@/lib/supabase/cached-rest";

export interface ArticleListItem {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  click_count: number;
  category: string;
  tags: string[];
  is_read: boolean;
  is_favorite: boolean;
  source: {
    id: string;
    title: string | null;
    site_url: string;
    favicon_url: string | null;
  } | null;
}

export type ArticleFilter = "all" | "unread" | "read" | "favorite";

/**
 * 글 목록(articles + source 조인)은 방문자와 무관하게 모두에게 동일하다 — 크론 수집 주기에 맞춰
 * 60초 정도 캐시해도 체감 지연이 없고, 매 요청마다 Supabase를 왕복하지 않아 초기 로딩이 빨라진다
 * (docs/decisions.md 참고). 방문자별 읽음 여부(read_status)만 이 캐시 밖에서 매번 가볍게 조회해 합친다.
 * supabase-js 대신 PostgREST에 직접 fetch()하는 이유는 `fetchCachedFromSupabase` 주석 참고
 * (2026-08-19 결정 — edge 런타임에서 unstable_cache가 인스턴스별로 따로 캐시되던 문제).
 */
export async function getCachedArticleFeed(): Promise<Omit<ArticleListItem, "is_read" | "is_favorite">[]> {
  return fetchCachedFromSupabase<Omit<ArticleListItem, "is_read" | "is_favorite">[]>(
    "articles",
    {
      select: "id,title,url,excerpt,thumbnail_url,published_at,click_count,category,tags,source:sources(id,title,site_url,favicon_url)",
      // 카드에 보이는 날짜(published_at) 기준 내림차순 — 화면에 표시되는 값과 정렬 순서가 어긋나지 않도록 한다.
      // published_at이 없는 경우만 맨 뒤로 보낸다.
      order: "published_at.desc.nullslast",
      limit: "200",
    },
    { revalidate: 60, tags: ["articles"] }
  );
}

/**
 * 항상 전체를 한 번에 불러온다 — 읽음/소스 필터는 클라이언트(ArticleList)에서 즉시 적용한다.
 * 탭을 바꿀 때마다 서버를 다시 왕복하면 Supabase 지연이 매번 그대로 드러나서 느리게 느껴졌기 때문
 * (docs/decisions.md 참고).
 * 읽음 여부는 전역 컬럼이 아니라 `read_status`(visitor_id, article_id) 테이블 기준 — 방문자(브라우저)별로 구분된다.
 */
/**
 * 로그인 계정별 읽음/즐겨찾기 여부를 붙여준다. read_status/favorites를 계정 기준으로만 조회하면
 * (.eq("user_id", ...)) PostgREST 기본 1000행 제한에 걸릴 수 있다 — 계정을 오래 쓸수록 누적 행이
 * 늘어나 결국 최신 글이 응답에서 잘려나가 안읽음으로 보이는 버그가 있었음. 화면에 보이는 글의
 * article_id로만 좁혀서 조회해 항상 1000행 미만이 되도록 한다. listArticles/searchArticles가 공유.
 * 로그인 안 한 사람(userId === null)은 애초에 읽음/즐겨찾기 기능을 못 쓰므로 전부 false로 내려준다
 * (열람 자체는 자유 — docs/decisions.md 참고).
 */
export async function attachUserState(
  articles: Omit<ArticleListItem, "is_read" | "is_favorite">[],
  userId: string | null
): Promise<ArticleListItem[]> {
  const supabase = createServiceClient();

  const [readRes, favoriteRes] =
    userId && articles.length > 0
      ? await Promise.all([
          supabase
            .from("read_status")
            .select("article_id")
            .eq("user_id", userId)
            .in(
              "article_id",
              articles.map((a) => a.id)
            ),
          supabase
            .from("favorites")
            .select("article_id")
            .eq("user_id", userId)
            .in(
              "article_id",
              articles.map((a) => a.id)
            ),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (readRes.error) throw readRes.error;
  if (favoriteRes.error) throw favoriteRes.error;

  const readIds = new Set((readRes.data ?? []).map((r) => r.article_id as string));
  const favoriteIds = new Set((favoriteRes.data ?? []).map((r) => r.article_id as string));
  return articles.map((a) => ({ ...a, is_read: readIds.has(a.id), is_favorite: favoriteIds.has(a.id) }));
}

export async function listArticles(userId: string | null): Promise<ArticleListItem[]> {
  const articles = await getCachedArticleFeed();
  return attachUserState(articles, userId);
}

interface SearchArticleRow {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  click_count: number;
  category: string;
  tags: string[];
  source_id: string;
  source_title: string | null;
  source_site_url: string;
  source_favicon_url: string | null;
}

/**
 * 제목/요약 전문검색 — listArticles와 달리 최근 200개 캐시가 아니라 전체 아카이브를 대상으로
 * DB에서 직접 검색한다(supabase/migrations/0007_article_search.sql의 search_articles RPC,
 * pg_trgm 기반). 검색 중이 아닐 때 쓰는 60초 캐시(getCachedArticleFeed)는 여기서 재사용하지 않는다 —
 * 검색어마다 결과가 달라 캐시 키를 만들 실익이 없다.
 */
export async function searchArticles(query: string, userId: string | null): Promise<ArticleListItem[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("search_articles", { search_query: query });
  if (error) throw error;

  const rows = (data as SearchArticleRow[]) ?? [];
  const articles: Omit<ArticleListItem, "is_read" | "is_favorite">[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    excerpt: r.excerpt,
    thumbnail_url: r.thumbnail_url,
    published_at: r.published_at,
    click_count: r.click_count,
    category: r.category ?? "general",
    tags: r.tags ?? [],
    source: { id: r.source_id, title: r.source_title, site_url: r.source_site_url, favicon_url: r.source_favicon_url },
  }));

  return attachUserState(articles, userId);
}

// 방문자 구분 없이 모든 유저에게 공통으로 보이는 전역 카운터라 read_status와 달리 articles 테이블에 그대로 둔다.
// 동시 클릭에도 안전하도록 "column + 1" 원자적 증가를 DB 함수(RPC)로 처리한다.
export async function incrementArticleClickCount(articleId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("increment_article_click_count", { target_id: articleId });
  if (error) throw error;
}

export async function markArticleRead(userId: string, articleId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("read_status")
    .upsert({ user_id: userId, article_id: articleId }, { onConflict: "user_id,article_id" });
  if (error) throw error;
}

export async function markArticleUnread(userId: string, articleId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("read_status").delete().eq("user_id", userId).eq("article_id", articleId);
  if (error) throw error;
}

export async function setArticleFavorite(userId: string, articleId: string, isFavorite: boolean): Promise<void> {
  const supabase = createServiceClient();
  if (isFavorite) {
    const { error } = await supabase
      .from("favorites")
      .upsert({ user_id: userId, article_id: articleId }, { onConflict: "user_id,article_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("article_id", articleId);
    if (error) throw error;
  }
}

export async function markAllArticlesRead(userId: string): Promise<void> {
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
      articleIds.map((id) => ({ user_id: userId, article_id: id })),
      { onConflict: "user_id,article_id" }
    );
  if (error) throw error;
}

export async function markAllArticlesUnread(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("read_status").delete().eq("user_id", userId);
  if (error) throw error;
}

/**
 * 로그인 전 익명 방문자 쿠키(visitor_id)로 쌓아온 읽음/즐겨찾기 기록을 최초 로그인 시 계정(user_id)으로
 * 옮긴다. 로그인 콜백(auth/callback)과 이메일/비밀번호 로그인 양쪽에서 호출된다. 이미 계정 쪽에 같은
 * article_id 행이 있으면(ignoreDuplicates) 건드리지 않고, 옮긴 뒤엔 방문자 쪽 원본을 지운다 — 다시
 * 호출돼도(visitor_id에 남은 행이 없으므로) 안전하게 아무 일도 하지 않는다.
 */
export async function migrateVisitorDataToUser(visitorId: string, userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: readRows, error: readError } = await supabase
    .from("read_status")
    .select("article_id, read_at")
    .eq("visitor_id", visitorId);
  if (readError) throw readError;
  if (readRows && readRows.length > 0) {
    const { error } = await supabase
      .from("read_status")
      .upsert(
        readRows.map((r) => ({ user_id: userId, article_id: r.article_id, read_at: r.read_at })),
        { onConflict: "user_id,article_id", ignoreDuplicates: true }
      );
    if (error) throw error;
  }
  await supabase.from("read_status").delete().eq("visitor_id", visitorId);

  const { data: favoriteRows, error: favoriteError } = await supabase
    .from("favorites")
    .select("article_id, created_at")
    .eq("visitor_id", visitorId);
  if (favoriteError) throw favoriteError;
  if (favoriteRows && favoriteRows.length > 0) {
    const { error } = await supabase
      .from("favorites")
      .upsert(
        favoriteRows.map((r) => ({ user_id: userId, article_id: r.article_id, created_at: r.created_at })),
        { onConflict: "user_id,article_id", ignoreDuplicates: true }
      );
    if (error) throw error;
  }
  await supabase.from("favorites").delete().eq("visitor_id", visitorId);
}
