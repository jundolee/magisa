"use client";

import { useRouter } from "next/navigation";
import type { ArticleFilter } from "@/lib/data/articles";

export interface SourceOption {
  id: string;
  label: string;
}

export function SourceFilterSelect({
  sources,
  current,
  filter,
}: {
  sources: SourceOption[];
  current: string; // "all" 또는 source id
  filter: ArticleFilter;
}) {
  const router = useRouter();

  return (
    <select
      aria-label="소스 필터"
      value={current}
      onChange={(e) => {
        const value = e.target.value;
        const params = new URLSearchParams();
        if (filter !== "unread") params.set("filter", filter);
        if (value !== "all") params.set("source", value);
        const qs = params.toString();
        router.replace(qs ? `/?${qs}` : "/");
      }}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid var(--seed-color-stroke-neutral)",
        background: "var(--seed-color-bg-layer-default)",
        color: "var(--seed-color-fg-neutral)",
        fontSize: 14,
      }}
    >
      <option value="all">전체 소스</option>
      {sources.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
