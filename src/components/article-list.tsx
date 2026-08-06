"use client";

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Text } from "@seed-design/react";
import { ArticleRow } from "./article-row";
import { ArticleFilterTabs } from "./article-filter-tabs";
import { SourceFilterSelect, type SourceOption } from "./source-filter-select";
import { SearchInput } from "./search-input";
import { ReadAllControls } from "./read-all-controls";
import { ScrollToTopButton } from "./scroll-to-top-button";
import { PaginationControls } from "./pagination-controls";
import type { ArticleFilter, ArticleListItem } from "@/lib/data/articles";

const SEARCH_DEBOUNCE_MS = 400;

const PAGE_SIZE = 30;

/**
 * 탭/소스 필터를 바꿀 때마다 서버에 새로 요청하면 Supabase 왕복 시간이 매번 그대로 드는 게 느려서,
 * 글 목록은 한 번만 받아오고 필터링은 브라우저 안에서 즉시 처리한다 (docs/decisions.md 참고).
 * 읽음 처리 등 실제 데이터 변경은 여전히 서버 액션 + revalidatePath로 이 컴포넌트의 articles prop을 갱신한다.
 */
export function ArticleList({
  articles,
  sources,
  initialFilter,
  initialSourceId,
  initialQuery,
}: {
  articles: ArticleListItem[];
  sources: SourceOption[];
  initialFilter: ArticleFilter;
  initialSourceId: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<ArticleFilter>(initialFilter);
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);

  // 검색어 변경은 (필터/소스 전환과 달리) 서버에서 전체 아카이브를 다시 검색해와야 해서 디바운스 뒤
  // 실제 네비게이션을 트리거한다 — 그 사이 필터/소스가 바뀔 수도 있으니 최신 값을 ref로 따로 들고 있는다
  // (렌더 중 ref를 직접 대입하면 안 되므로 effect에서 동기화한다).
  const filterRef = useRef(filter);
  const sourceIdRef = useRef(sourceId);
  useEffect(() => {
    filterRef.current = filter;
    sourceIdRef.current = sourceId;
  }, [filter, sourceId]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearching, startSearchTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // 새 탭으로 열리는 동안 서버 액션(revalidatePath) 왕복을 기다리면 클릭과 목록 반영 사이에
  // 체감되는 시간차가 생긴다 — 클릭 즉시 이 목록에서 읽음으로 보이도록 낙관적으로 먼저 반영하고,
  // 실제 서버 값(articles prop)이 도착하면 자연스럽게 그 값으로 정리된다.
  const [optimisticArticles, markReadOptimistically] = useOptimistic(articles, (state, articleId: string) =>
    state.map((a) => (a.id === articleId ? { ...a, is_read: true } : a))
  );
  const [, startTransition] = useTransition();

  function handleRead(articleId: string) {
    startTransition(() => {
      markReadOptimistically(articleId);
    });
  }

  const unreadCount = useMemo(() => optimisticArticles.filter((a) => !a.is_read).length, [optimisticArticles]);

  const visibleArticles = useMemo(() => {
    return optimisticArticles.filter((a) => {
      if (filter === "unread" && a.is_read) return false;
      if (filter === "read" && !a.is_read) return false;
      if (filter === "favorite" && !a.is_favorite) return false;
      if (sourceId !== "all" && a.source?.id !== sourceId) return false;
      return true;
    });
  }, [optimisticArticles, filter, sourceId]);

  const totalPages = Math.max(1, Math.ceil(visibleArticles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedArticles = visibleArticles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function goToPage(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildUrl(nextFilter: ArticleFilter, nextSourceId: string, nextQuery: string) {
    const params = new URLSearchParams();
    if (nextFilter !== "unread") params.set("filter", nextFilter);
    if (nextSourceId !== "all") params.set("source", nextSourceId);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function updateUrl(nextFilter: ArticleFilter, nextSourceId: string) {
    // router.replace 대신 history API를 직접 써서 Next.js 서버 재요청 없이 주소창만 맞춘다.
    window.history.replaceState(null, "", buildUrl(nextFilter, nextSourceId, query));
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
    // 타이핑할 때마다 서버 검색을 왕복하지 않도록 디바운스 후에만 실제 네비게이션(서버 재검색)을 건다.
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const url = buildUrl(filterRef.current, sourceIdRef.current, value);
      startSearchTransition(() => {
        router.replace(url, { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          글 목록
        </Text>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {unreadCount > 0 && (
            <Badge size="medium" variant="solid" tone="brand">
              안읽음 {unreadCount}
            </Badge>
          )}
          <ReadAllControls />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <SearchInput value={query} onValueChange={handleQueryChange} isPending={isSearching} />
      </div>

      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <ArticleFilterTabs
          current={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
            updateUrl(value, sourceId);
          }}
        />
        <SourceFilterSelect
          sources={sources}
          current={sourceId}
          onChange={(value) => {
            setSourceId(value);
            setPage(1);
            updateUrl(filter, value);
          }}
        />
      </div>

      <ul style={{ display: "flex", flexDirection: "column", listStyle: "none", padding: 0, margin: 0 }}>
        {pagedArticles.map((article) => (
          <ArticleRow key={article.id} article={article} onRead={handleRead} />
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
