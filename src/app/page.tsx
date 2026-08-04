import { Suspense } from "react";
import { cookies } from "next/headers";
import { listArticles, type ArticleFilter } from "@/lib/data/articles";
import { listSources } from "@/lib/data/sources";
import { ArticleList } from "@/components/article-list";
import { ArticleListSkeleton } from "@/components/article-list-skeleton";
import { PageHeader } from "@/components/page-header";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

export const dynamic = "force-dynamic";

function parseFilter(raw: string | undefined): ArticleFilter {
  return raw === "read" || raw === "all" ? raw : "unread";
}

/**
 * 글 목록 조회(캐시돼 있어도 방문자별 read_status 조회는 매번 발생)를 Suspense 경계 안에 둬서,
 * 헤더는 즉시 그리고 목록은 스켈레톤을 먼저 보여준 뒤 스트리밍으로 채운다.
 */
async function ArticleListSection({
  initialFilter,
  initialSourceId,
}: {
  initialFilter: ArticleFilter;
  initialSourceId: string;
}) {
  // 읽음 여부는 방문자(브라우저)별로 구분된다 — proxy.ts가 부여한 익명 쿠키 기준 (docs/decisions.md 참고).
  const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value ?? null;
  console.log("[DEBUG visitorId/read]", visitorId);

  // 탭/소스 필터 전환마다 서버를 다시 왕복하지 않도록, 전체 글/소스를 한 번만 불러와
  // 클라이언트(ArticleList)에서 즉시 필터링한다 (docs/decisions.md 참고).
  const [articles, sources] = await Promise.all([listArticles(visitorId), listSources()]);

  const sourceOptions = sources
    .map((s) => ({ id: s.id, label: s.title ?? s.site_url }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  return (
    <ArticleList
      articles={articles}
      sources={sourceOptions}
      initialFilter={initialFilter}
      initialSourceId={initialSourceId}
    />
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; source?: string }>;
}) {
  const { filter: rawFilter, source: sourceId } = await searchParams;
  const initialFilter = parseFilter(rawFilter);

  return (
    <main>
      {/* 소스 관리(/sources)는 관리자 전용이라 눈에 띄는 링크를 두지 않는다 — 주소를 직접 아는 사람만 접근 (docs/decisions.md 참고) */}
      <PageHeader />

      <Suspense fallback={<ArticleListSkeleton />}>
        <ArticleListSection initialFilter={initialFilter} initialSourceId={sourceId ?? "all"} />
      </Suspense>
    </main>
  );
}
