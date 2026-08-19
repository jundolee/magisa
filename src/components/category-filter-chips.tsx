"use client";

import { CATEGORIES, type CategoryId } from "@/lib/categories";

export function CategoryFilterChips({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}: {
  selectedCategory: CategoryId;
  onSelectCategory: (categoryId: CategoryId) => void;
  categoryCounts?: Record<string, number>;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 4,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const count = categoryCounts ? categoryCounts[cat.id] : undefined;

        // 카운트가 0인 카테고리는 '전체'가 아닌 경우 숨기지 않고 비활성/표시 유지
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 11px",
              borderRadius: "16px",
              border: isSelected
                ? "1px solid var(--seed-color-palette-gray-900, #111)"
                : "1px solid var(--seed-color-stroke-neutral-subtle, #e5e5e5)",
              backgroundColor: isSelected
                ? "var(--seed-color-palette-gray-900, #222)"
                : "var(--seed-color-bg-layer-default, #fff)",
              color: isSelected
                ? "var(--seed-color-palette-static-white, #fff)"
                : "var(--seed-color-fg-neutral, #444)",
              fontSize: "13px",
              fontWeight: isSelected ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
          >
            <span>{cat.label}</span>
            {count !== undefined && count > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  opacity: isSelected ? 0.9 : 0.6,
                  fontWeight: 500,
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
