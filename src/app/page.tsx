import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { attachUserState, getCachedArticleFeed, searchArticles, type ArticleFilter } from "@/lib/data/articles";
import { listSources } from "@/lib/data/sources";
import { ArticleList } from "@/components/article-list";
import { ArticleListSkeleton } from "@/components/article-list-skeleton";
import { PageHeader } from "@/components/page-header";
import { HeaderAuthSlot } from "@/components/header-auth-slot";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { CATEGORY_MAP, type CategoryId } from "@/lib/categories";

// dynamic="force-dynamic"을 쓰면 모든 fetch()가 cache: "no-store"로 강제되어 PostgREST 캐시가 무력화된다.
// fetchCache = "default-cache"를 지정해 searchParams로 인한 동적 렌더링을 유지하면서도
// fetchCachedFromSupabase의 force-cache(60초 Vercel Data Cache)가 정상 작동하게 한다.
export const fetchCache = "default-cache";
// 전역 SEO 메타데이터가 포함된 홈은 Edge 함수 크기 제한을 피하기 위해 Node.js에서 렌더링한다.
export const runtime = "nodejs";

// 필터 탭을 명시적으로 고르지 않았을 때의 기본값 — 검색 중이 아니면 "안읽음"이 자연스럽지만,
// 검색은 이미 읽은 글을 다시 찾으려는 경우가 흔해서 검색어가 있을 땐 기본을 "전체"로 바꾼다.
function parseFilter(raw: string | undefined, hasQuery: boolean): ArticleFilter {
  if (raw === "read" || raw === "all" || raw === "favorite" || raw === "unread") return raw;
  return hasQuery ? "all" : "unread";
}

function parseCategory(raw: string | undefined): CategoryId {
  if (raw && CATEGORY_MAP.has(raw as CategoryId)) return raw as CategoryId;
  return "all";
}

/**
 * 글 목록 조회(캐시돼 있어도 방문자별 read_status 조회는 매번 발생)를 Suspense 경계 안에 둬서,
 * 헤더는 즉시 그리고 목록은 스켈레톤을 먼저 보여준 뒤 스트리밍으로 채운다.
 */
async function ArticleListSection({
  initialFilter,
  initialSourceId,
  initialCategory,
  initialQuery,
}: {
  initialFilter: ArticleFilter;
  initialSourceId: string;
  initialCategory: CategoryId;
  initialQuery: string;
}) {
  // 세션 확인, 글 목록 캐시 조회, 소스 목록 조회를 모두 병렬로 시작해 첫 응답 지연을 최소화한다.
  const [user, rawArticles, sources] = await Promise.all([
    getCurrentUser(),
    initialQuery ? null : getCachedArticleFeed(),
    listSources(),
  ]);
  const userId = user?.id ?? null;

  // 검색어(q)가 있을 때만 예외 — 검색은 최근 200개 캐시가 아니라 전체 아카이브를 대상으로 해야 하므로
  // searchArticles()로 DB에서 직접 검색해온다.
  const articles = initialQuery
    ? await searchArticles(initialQuery, userId)
    : await attachUserState(rawArticles!, userId);

  const sourceOptions = sources
    .map((s) => ({ id: s.id, label: s.title ?? s.site_url }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  return (
    <ArticleList
      articles={articles}
      sources={sourceOptions}
      initialFilter={initialFilter}
      initialSourceId={initialSourceId}
      initialCategory={initialCategory}
      initialQuery={initialQuery}
    />
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; source?: string; category?: string; q?: string }>;
}) {
  await connection();
  const { filter: rawFilter, source: sourceId, category: rawCategory, q } = await searchParams;
  const initialQuery = (q ?? "").trim();
  const initialFilter = parseFilter(rawFilter, initialQuery.length > 0);
  const initialCategory = parseCategory(rawCategory);

  return (
    <main>
      {/* 소스 관리(/sources)는 관리자 전용이라 눈에 띄는 링크를 두지 않는다 — 주소를 직접 아는 사람만 접근 (docs/decisions.md 참고) */}
      <PageHeader navHref="/suggest" navLabel="블로그 추천하기" authSlot={<HeaderAuthSlot />} />

      {/* 처음 들어온 방문자가 "이게 뭐 하는 사이트인지" 바로 알 수 있게 짧게 설명 (docs/growth-strategy.md 참고) */}
      <Text
        as="p"
        textStyle="t3Regular"
        color="var(--seed-color-fg-neutral-muted)"
        style={{ marginBottom: 20 }}
      >
        구독한 테크 블로그의 새 글을 매일 모아 보는 아카이버예요. 로그인하면 읽음/즐겨찾기가 계정에 저장돼요.
      </Text>

      <nav aria-label="콘텐츠 탐색" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <Link href="/topics"><Text as="span" textStyle="t3Medium" color="var(--seed-color-fg-brand)">주제별 글</Text></Link>
        <Link href="/blogs"><Text as="span" textStyle="t3Medium" color="var(--seed-color-fg-brand)">블로그 목록</Text></Link>
        <Link href="/digest"><Text as="span" textStyle="t3Medium" color="var(--seed-color-fg-brand)">주간 큐레이션</Text></Link>
      </nav>

      <Suspense fallback={<ArticleListSkeleton />}>
        <ArticleListSection
          initialFilter={initialFilter}
          initialSourceId={sourceId ?? "all"}
          initialCategory={initialCategory}
          initialQuery={initialQuery}
        />
      </Suspense>
    </main>
  );
}
