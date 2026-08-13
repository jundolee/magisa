import { Suspense } from "react";
import { listArticles, searchArticles, type ArticleFilter } from "@/lib/data/articles";
import { listSources } from "@/lib/data/sources";
import { ArticleList } from "@/components/article-list";
import { ArticleListSkeleton } from "@/components/article-list-skeleton";
import { PageHeader } from "@/components/page-header";
import { HeaderAuthSlot } from "@/components/header-auth-slot";
import { getCurrentUser } from "@/lib/supabase/current-user";

export const dynamic = "force-dynamic";
// Vercel Node 서버리스 함수는 고정 리전(iad1, 버지니아)에서만 실행돼 한국 사용자 기준
// 왕복이 매번 태평양을 건너감 — Edge Runtime + preferredRegion="global"로 바꿔 방문자와
// 가장 가까운 엣지에서 직접 실행되게 한다. Vercel에서 이 옵션은 runtime="edge"일 때만 적용됨
// (docs/decisions.md 참고).
export const runtime = "edge";
export const preferredRegion = "global";

// 필터 탭을 명시적으로 고르지 않았을 때의 기본값 — 검색 중이 아니면 "안읽음"이 자연스럽지만,
// 검색은 이미 읽은 글을 다시 찾으려는 경우가 흔해서 검색어가 있을 땐 기본을 "전체"로 바꾼다.
function parseFilter(raw: string | undefined, hasQuery: boolean): ArticleFilter {
  if (raw === "read" || raw === "all" || raw === "favorite" || raw === "unread") return raw;
  return hasQuery ? "all" : "unread";
}

/**
 * 글 목록 조회(캐시돼 있어도 방문자별 read_status 조회는 매번 발생)를 Suspense 경계 안에 둬서,
 * 헤더는 즉시 그리고 목록은 스켈레톤을 먼저 보여준 뒤 스트리밍으로 채운다.
 */
async function ArticleListSection({
  initialFilter,
  initialSourceId,
  initialQuery,
}: {
  initialFilter: ArticleFilter;
  initialSourceId: string;
  initialQuery: string;
}) {
  // 읽음/즐겨찾기 여부는 로그인 계정별로 구분된다 — 로그인 안 한 사람은 전부 false로 내려온다
  // (열람 자체는 자유, docs/decisions.md 참고).
  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  // 탭/소스 필터 전환마다 서버를 다시 왕복하지 않도록, 전체 글/소스를 한 번만 불러와
  // 클라이언트(ArticleList)에서 즉시 필터링한다 (docs/decisions.md 참고).
  // 검색어(q)가 있을 때만 예외 — 검색은 최근 200개 캐시가 아니라 전체 아카이브를 대상으로 해야 하므로
  // searchArticles()로 DB에서 직접 검색해온다.
  const [articles, sources] = await Promise.all([
    initialQuery ? searchArticles(initialQuery, userId) : listArticles(userId),
    listSources(),
  ]);

  const sourceOptions = sources
    .map((s) => ({ id: s.id, label: s.title ?? s.site_url }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  return (
    <ArticleList
      articles={articles}
      sources={sourceOptions}
      initialFilter={initialFilter}
      initialSourceId={initialSourceId}
      initialQuery={initialQuery}
    />
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; source?: string; q?: string }>;
}) {
  const { filter: rawFilter, source: sourceId, q } = await searchParams;
  const initialQuery = (q ?? "").trim();
  const initialFilter = parseFilter(rawFilter, initialQuery.length > 0);

  return (
    <main>
      {/* 소스 관리(/sources)는 관리자 전용이라 눈에 띄는 링크를 두지 않는다 — 주소를 직접 아는 사람만 접근 (docs/decisions.md 참고) */}
      <PageHeader authSlot={<HeaderAuthSlot />} />

      <Suspense fallback={<ArticleListSkeleton />}>
        <ArticleListSection
          initialFilter={initialFilter}
          initialSourceId={sourceId ?? "all"}
          initialQuery={initialQuery}
        />
      </Suspense>
    </main>
  );
}
