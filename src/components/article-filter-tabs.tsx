"use client";

import type { ArticleFilter } from "@/lib/data/articles";

const OPTIONS: { value: ArticleFilter; label: string }[] = [
  { value: "unread", label: "안읽은 글" },
  { value: "all", label: "전체" },
  { value: "read", label: "읽은 글" },
  { value: "favorite", label: "저장한 글" },
];

export function ArticleFilterTabs({ current, onChange }: {
  current: ArticleFilter;
  onChange: (value: ArticleFilter) => void;
}) {
  return (
    <div className="feed-status-tabs" role="group" aria-label="글 필터">
      {OPTIONS.map((option) => (
        <button type="button" key={option.value} aria-pressed={current === option.value}
          onClick={() => onChange(option.value)}>{option.label}</button>
      ))}
    </div>
  );
}
