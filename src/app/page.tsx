import { Suspense } from "react";
import { cookies } from "next/headers";
import { listArticles, searchArticles, type ArticleFilter } from "@/lib/data/articles";
import { listSources } from "@/lib/data/sources";
import { ArticleList } from "@/components/article-list";
import { ArticleListSkeleton } from "@/components/article-list-skeleton";
import { PageHeader } from "@/components/page-header";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

export const dynamic = "force-dynamic";

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
  // 읽음 여부는 방문자(브라우저)별로 구분된다 — proxy.ts가 부여한 익명 쿠키 기준 (docs/decisions.md 참고).
  const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value ?? null;

  // 탭/소스 필터 전환마다 서버를 다시 왕복하지 않도록, 전체 글/소스를 한 번만 불러와
  // 클라이언트(ArticleList)에서 즉시 필터링한다 (docs/decisions.md 참고).
  // 검색어(q)가 있을 때만 예외 — 검색은 최근 200개 캐시가 아니라 전체 아카이브를 대상으로 해야 하므로
  // searchArticles()로 DB에서 직접 검색해온다.
  const [articles, sources] = await Promise.all([
    initialQuery ? searchArticles(initialQuery, visitorId) : listArticles(visitorId),
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
      <PageHeader />

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
