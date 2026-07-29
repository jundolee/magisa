"use client";

import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import type { ArticleFilter } from "@/lib/data/articles";

const OPTIONS: { value: ArticleFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "unread", label: "안읽음" },
  { value: "read", label: "읽음" },
];

export function ArticleFilterTabs({
  current,
  onChange,
}: {
  current: ArticleFilter;
  onChange: (value: ArticleFilter) => void;
}) {
  return (
    <SegmentedControl aria-label="글 필터" value={current} onValueChange={(value) => onChange(value as ArticleFilter)}>
      {OPTIONS.map((opt) => (
        <SegmentedControlItem key={opt.value} value={opt.value}>
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
