"use client";

import { track } from "@amplitude/analytics-browser";

/** Send search quality metrics without collecting the text a reader searched for. */
export function trackArticleSearchCompleted(
  query: string,
  resultCount: number,
  category: string,
  hasSourceFilter: boolean
): void {
  if (
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" ||
    !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
  ) return;

  const normalizedQuery = query.trim();
  if (!normalizedQuery) return;

  track("article_search_completed", {
    query_length: Array.from(normalizedQuery).length,
    term_count: normalizedQuery.split(/\s+/u).filter(Boolean).length,
    result_count: resultCount,
    category: category === "all" ? null : category,
    has_source_filter: hasSourceFilter,
  });
}
