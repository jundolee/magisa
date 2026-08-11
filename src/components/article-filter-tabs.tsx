"use client";

import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import type { ArticleFilter } from "@/lib/data/articles";

const OPTIONS: { value: ArticleFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "unread", label: "안읽음" },
  { value: "read", label: "읽음" },
  { value: "favorite", label: "즐겨찾기" },
];

export function ArticleFilterTabs({
  current,
  onChange,
}: {
  current: ArticleFilter;
  onChange: (value: ArticleFilter) => void;
}) {
  return (
    // SEED 기본 패딩(가로 24px×2)+min-width(86px)로 4개를 나열하면 396px가 필요해 320~390px
    // 화면에서 항상 가로 스크롤이 생겼다 — 패딩/최소폭을 좁혀 4개가 좁은 화면에도 한 줄에 다 들어가게 한다.
    <SegmentedControl aria-label="글 필터" value={current} onValueChange={(value) => onChange(value as ArticleFilter)}>
      {OPTIONS.map((opt) => (
        <SegmentedControlItem
          key={opt.value}
          value={opt.value}
          style={{ minWidth: 0, paddingInline: 10 }}
        >
          {opt.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
