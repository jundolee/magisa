"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { Badge, Text } from "@seed-design/react";
import { ArticleRow } from "./article-row";
import { ArticleFilterTabs } from "./article-filter-tabs";
import { SourceFilterSelect, type SourceOption } from "./source-filter-select";
import { ExpandableSearch } from "./expandable-search";
import { ReadAllControls } from "./read-all-controls";
import { ScrollToTopButton } from "./scroll-to-top-button";
import { PaginationControls } from "./pagination-controls";
import { CategoryFilterChips } from "./category-filter-chips";
import { loadArticlesAction } from "@/app/articles/actions";
import type { ArticleFilter, ArticleListItem } from "@/lib/data/articles";
import type { CategoryId } from "@/lib/categories";

const SEARCH_DEBOUNCE_MS = 400;

// 한 글자짜리 검색어는 pg_trgm 인덱스가 트라이그램을 못 뽑아내 테이블 전체 스캔으로 떨어진다
// (search_articles RPC 참고) — 타이핑 중 자동검색은 보류하고, Enter로 명시적으로 요청할 때만 허용한다.
const MIN_AUTO_SEARCH_LENGTH = 2;

const PAGE_SIZE = 30;

/**
 * 탭/소스/카테고리 필터를 바꿀 때마다 서버에 새로 요청하면 Supabase 왕복 시간이 매번 그대로 드는 게 느려서,
 * 글 목록은 한 번만 받아오고 필터링은 브라우저 안에서 즉시 처리한다 (docs/decisions.md 참고).
 * 읽음 처리 등 실제 데이터 변경은 여전히 서버 액션 + revalidatePath로 이 컴포넌트의 articles prop을 갱신한다.
 */
export function ArticleList({
  articles,
  sources,
  initialFilter,
  initialSourceId,
  initialCategory = "all",
  initialQuery,
}: {
  articles: ArticleListItem[];
  sources: SourceOption[];
  initialFilter: ArticleFilter;
  initialSourceId: string;
  initialCategory?: CategoryId;
  initialQuery: string;
}) {
  const [filter, setFilter] = useState<ArticleFilter>(initialFilter);
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [category, setCategory] = useState<CategoryId>(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);

  // 검색 결과로 목록을 갈아끼우는 상태 — null이면 "검색 중이 아님"을 뜻하고, 이때는 아래에서 매 렌더마다
  // articles(서버가 내려준, revalidatePath로 계속 최신 유지되는 기본 목록) prop을 그대로 읽는다. 그래서
  // 검색어를 지울 때도 대개는 setSearchResults(null)만으로 충분하고, 이후 마크 읽음 등으로 articles가
  // 갱신돼도 별도 동기화 없이 항상 최신이 반영된다.
  // 예외는 페이지가 처음부터 ?q=로 열린 경우 — 그때는 articles prop 자체가 검색 결과라 "기본 목록"이
  // 따로 없으므로, 검색어를 처음 지울 때만 실제로 받아와 이 ref에 캐시해둔다(그 뒤로는 이 스냅샷을 씀 —
  // 즉, 이 경우에 한해 이후 revalidatePath로 인한 기본 목록 갱신은 반영되지 않는, 필터/소스와 동일한
  // 수준의 트레이드오프다).
  const [searchResults, setSearchResults] = useState<ArticleListItem[] | null>(null);
  const startedWithQuery = initialQuery.trim().length > 0;
  const defaultArticlesRef = useRef<ArticleListItem[] | null>(null);
  // 검색창이 펼쳐지면 그 줄에서 배지/전체읽음 버튼을 숨긴다 — 좁은 화면에서 네 가지가 한 줄에
  // 다 안 들어가 여러 단으로 겹쳐 접히며 그 아래 내용까지 크게 밀려나던 문제(docs/decisions.md 참고)를
  // 애초에 그 줄에 검색창만 남겨서 해결한다.
  const [searchExpanded, setSearchExpanded] = useState(startedWithQuery);

  const baseArticles = searchResults ?? articles;

  // 필터/소스 전환과 달리 검색은 화면에 로드된 데이터(최근 200개)가 아니라 전체 아카이브를 다시 조회해야
  // 해서, 입력마다 서버를 왕복하지 않도록 디바운스 후 서버 액션(loadArticlesAction)으로 데이터를 받아와
  // 로컬 상태만 갈아끼운다 — 전체 페이지를 다시 그리지 않으니 스켈레톤이 재노출되지 않고, 검색과 무관한
  // listSources()도 다시 조회하지 않는다.
  // 검색 URL을 만들 때 그 사이 바뀌었을 수 있는 필터/소스 최신값이 필요한데 렌더 중 ref를 직접
  // 대입할 수 없어 effect에서 동기화해둔다.
  const filterRef = useRef(filter);
  const sourceIdRef = useRef(sourceId);
  const categoryRef = useRef(category);
  useEffect(() => {
    filterRef.current = filter;
    sourceIdRef.current = sourceId;
    categoryRef.current = category;
  }, [filter, sourceId, category]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 검색어별 결과 캐시 — 지웠다 다시 같은 단어를 치거나 오타를 지우는 흔한 패턴에서 서버 왕복 없이
  // 즉시 이전 결과를 보여준다.
  const searchCacheRef = useRef<Map<string, ArticleListItem[]>>(new Map());
  // 디바운스가 끝나기 전에 더 최신 검색이 시작되면, 먼저 보낸 요청이 나중에 응답으로 돌아와도
  // 최신 결과를 덮어쓰지 않도록 요청마다 증가하는 일련번호로 낡은 응답을 걸러낸다.
  const requestSeqRef = useRef(0);
  const [isSearching, startSearchTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // 새 탭으로 열리는 동안 서버 액션(revalidatePath) 왕복을 기다리면 클릭과 목록 반영 사이에
  // 체감되는 시간차가 생긴다 — 클릭 즉시 이 목록에서 읽음으로 보이도록 낙관적으로 먼저 반영하고,
  // 실제 서버 값(baseArticles)이 도착하면 자연스럽게 그 값으로 정리된다.
  const [optimisticArticles, markReadOptimistically] = useOptimistic(baseArticles, (state, articleId: string) =>
    state.map((a) => (a.id === articleId ? { ...a, is_read: true } : a))
  );
  const [, startTransition] = useTransition();

  function handleRead(articleId: string) {
    startTransition(() => {
      markReadOptimistically(articleId);
    });
  }

  const unreadCount = useMemo(() => optimisticArticles.filter((a) => !a.is_read).length, [optimisticArticles]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const a of optimisticArticles) {
      if (filter === "unread" && a.is_read) continue;
      if (filter === "read" && !a.is_read) continue;
      if (filter === "favorite" && !a.is_favorite) continue;
      if (sourceId !== "all" && a.source?.id !== sourceId) continue;

      counts.all = (counts.all ?? 0) + 1;
      const cat = a.category ?? "general";
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [optimisticArticles, filter, sourceId]);

  const visibleArticles = useMemo(() => {
    return optimisticArticles.filter((a) => {
      if (filter === "unread" && a.is_read) return false;
      if (filter === "read" && !a.is_read) return false;
      if (filter === "favorite" && !a.is_favorite) return false;
      if (sourceId !== "all" && a.source?.id !== sourceId) return false;
      if (category !== "all") {
        const itemCategory = a.category ?? "general";
        if (itemCategory !== category) return false;
      }
      return true;
    });
  }, [optimisticArticles, filter, sourceId, category]);

  const totalPages = Math.max(1, Math.ceil(visibleArticles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedArticles = visibleArticles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function goToPage(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildUrl(nextFilter: ArticleFilter, nextSourceId: string, nextCategory: CategoryId, nextQuery: string) {
    const params = new URLSearchParams();
    if (nextFilter !== "unread") params.set("filter", nextFilter);
    if (nextSourceId !== "all") params.set("source", nextSourceId);
    if (nextCategory !== "all") params.set("category", nextCategory);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function updateUrl(nextFilter: ArticleFilter, nextSourceId: string, nextCategory: CategoryId) {
    // history API를 직접 써서 Next.js 서버 재요청 없이 주소창만 맞춘다.
    window.history.replaceState(null, "", buildUrl(nextFilter, nextSourceId, nextCategory, query));
  }

  function handleCategoryChange(nextCategory: CategoryId) {
    setCategory(nextCategory);
    setPage(1);
    updateUrl(filter, sourceId, nextCategory);
  }

  function runSearch(rawValue: string) {
    window.history.replaceState(null, "", buildUrl(filterRef.current, sourceIdRef.current, categoryRef.current, rawValue));

    const trimmed = rawValue.trim();
    const seq = ++requestSeqRef.current;

    if (!trimmed) {
      // 페이지가 검색어 없이 열렸던 보통의 경우엔 articles prop이 곧 기본 목록이라 서버 왕복 없이
      // 바로 복귀한다. ?q=로 열려 기본 목록을 따로 못 받아본 경우에만 예외적으로 한 번 받아온다.
      if (!startedWithQuery) {
        setSearchResults(null);
        return;
      }
      if (defaultArticlesRef.current) {
        setSearchResults(defaultArticlesRef.current);
        return;
      }
      startSearchTransition(async () => {
        const result = await loadArticlesAction("");
        if (seq !== requestSeqRef.current) return;
        defaultArticlesRef.current = result;
        setSearchResults(result);
      });
      return;
    }

    const cached = searchCacheRef.current.get(trimmed);
    if (cached) {
      setSearchResults(cached);
      return;
    }

    startSearchTransition(async () => {
      const result = await loadArticlesAction(trimmed);
      if (seq !== requestSeqRef.current) return; // 그사이 더 최신 검색이 시작됐으면 낡은 응답은 버린다
      searchCacheRef.current.set(trimmed, result);
      setSearchResults(result);
    });
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      // 지우는 동작은 대개 캐시/prop으로 즉시 복귀라 디바운스 없이 바로 반영한다.
      runSearch(value);
      return;
    }
    if (trimmed.length < MIN_AUTO_SEARCH_LENGTH) return; // Enter로 명시 요청할 때만 검색 (위 상수 설명 참고)

    // 타이핑할 때마다 서버를 왕복하지 않도록 디바운스 후에만 실제 검색을 건다.
    searchDebounceRef.current = setTimeout(() => runSearch(value), SEARCH_DEBOUNCE_MS);
  }

  function handleSearchSubmit() {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    runSearch(query);
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: query.trim() ? 8 : 20,
        }}
      >
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          글 목록
        </Text>
        {/* 검색창이 펼쳐지면 배지/전체읽음 버튼을 숨기고 이 그룹이 줄 전체(flexBasis:100%)를
            차지하게 한다 — 넷을 한 줄에 다 맞추려다 보니 좁은 화면에서 검색창과 버튼들이 각자
            다른 지점에서 줄바꿈되며 그 아래 목록까지 크게 밀려나던 문제(docs/decisions.md 참고)를,
            펼친 동안은 애초에 검색창 하나만 그 줄에 있게 해서 없앤다. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            gap: 12,
            flexBasis: searchExpanded ? "100%" : "auto",
          }}
        >
          <ExpandableSearch
            value={query}
            onValueChange={handleQueryChange}
            onSubmit={handleSearchSubmit}
            expanded={searchExpanded}
            onExpandedChange={setSearchExpanded}
          />
          {!searchExpanded && unreadCount > 0 && (
            <Badge size="medium" variant="solid" tone="brand">
              안읽음 {unreadCount}
            </Badge>
          )}
          {!searchExpanded && <ReadAllControls />}
        </div>
      </div>

      {query.trim() && (
        <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginBottom: 16 }}>
          {isSearching ? "검색 중…" : `${optimisticArticles.length}개 검색됨`}
        </Text>
      )}

      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* 가로 스크롤 대신 flexShrink:0 + 부모의 flexWrap으로 이 자리에 다 안 들어가면
            소스 드롭다운과 나란히 두지 않고 다음 줄로 통째로 넘어가게 한다 — 예전엔 이 자리를
            overflow-x:auto로 만들어 좁은 화면에서 옆으로 스크롤해야 "즐겨찾기"가 보였는데,
            그 자체가 화면이 어색하게 잘려 보인다는 피드백을 받아 없앴다. */}
        <div style={{ flexShrink: 0 }}>
          <ArticleFilterTabs
            current={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
              updateUrl(value, sourceId, category);
            }}
          />
        </div>
        <SourceFilterSelect
          sources={sources}
          current={sourceId}
          onChange={(value) => {
            setSourceId(value);
            setPage(1);
            updateUrl(filter, value, category);
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <CategoryFilterChips
          selectedCategory={category}
          onSelectCategory={handleCategoryChange}
          categoryCounts={categoryCounts}
        />
      </div>

      <ul style={{ display: "flex", flexDirection: "column", listStyle: "none", padding: 0, margin: 0 }}>
        {pagedArticles.map((article, index) => (
          // 페이지 첫 3개는 스크롤 전에 바로 보이는 썸네일이라 lazy 대신 우선 로드 (ArticleRow 참고).
          <ArticleRow
            key={article.id}
            article={article}
            onRead={handleRead}
            onSelectCategory={handleCategoryChange}
            priority={index < 3}
          />
        ))}
      </ul>
      {visibleArticles.length === 0 && (
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
          표시할 글이 없습니다.
        </Text>
      )}
      {totalPages > 1 && <PaginationControls page={safePage} totalPages={totalPages} onChange={goToPage} />}
      <ScrollToTopButton />
    </>
  );
}
