"use client";

import { CATEGORIES, type CategoryId } from "@/lib/categories";

export function CategoryFilterChips({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: CategoryId;
  onSelectCategory: (categoryId: CategoryId) => void;
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
          </button>
        );
      })}
    </div>
  );
}
