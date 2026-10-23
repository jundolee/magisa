"use client";

import type { ArticleFilter } from "@/lib/data/articles";
import { TabsIndicator, TabsList, TabsRoot, TabsTrigger } from "@seed-design/react";

const OPTIONS: { value: ArticleFilter; label: string }[] = [
  { value: "all", label: "모든 글" },
  { value: "unread", label: "읽지 않은 글" },
  { value: "read", label: "읽은 글" },
  { value: "favorite", label: "저장한 글" },
];

export function ArticleFilterTabs({ current, onChange }: {
  current: ArticleFilter;
  onChange: (value: ArticleFilter) => void;
}) {
  return (
    <TabsRoot
      className="article-status-tabs"
      value={current}
      onValueChange={(value) => onChange(value as ArticleFilter)}
      triggerLayout="fill"
      size="medium"
    >
      <TabsList className="article-status-tabs-list" aria-label="글 필터">
        {OPTIONS.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>
        ))}
        <TabsIndicator />
      </TabsList>
    </TabsRoot>
  );
}
