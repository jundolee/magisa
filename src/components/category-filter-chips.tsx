"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@seed-design/react";
import { IconChevronLeftLine, IconChevronRightLine } from "@karrotmarket/react-monochrome-icon";
import { CATEGORIES, type CategoryId } from "@/lib/categories";

export function CategoryFilterChips({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: CategoryId;
  onSelectCategory: (categoryId: CategoryId) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    setCanScrollLeft(viewport.scrollLeft > 2);
    setCanScrollRight(viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    updateScrollButtons();
    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(viewport);
    resizeObserver.observe(content);
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons]);

  function scroll(direction: -1 | 1) {
    const viewport = scrollRef.current;
    if (!viewport) return;
    // Move by roughly one full visible page so each click reveals a useful new
    // group of topics instead of nudging the chip row a few items at a time.
    viewport.scrollBy({ left: direction * Math.max(280, viewport.clientWidth), behavior: "smooth" });
  }

  return (
    <div className="category-filter-scroll-shell">
      {canScrollLeft && (
        <button type="button" className="category-filter-arrow category-filter-arrow-left"
          aria-label="주제 필터를 왼쪽으로 이동" onClick={() => scroll(-1)}>
          <Icon svg={<IconChevronLeftLine />} />
        </button>
      )}
      <div ref={scrollRef} className="category-filter-scroll" onScroll={updateScrollButtons}>
        <div ref={contentRef} className="category-filter-scroll-content">
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
      </div>
      {canScrollRight && (
        <button type="button" className="category-filter-arrow category-filter-arrow-right"
          aria-label="주제 필터를 오른쪽으로 이동" onClick={() => scroll(1)}>
          <Icon svg={<IconChevronRightLine />} />
        </button>
      )}
    </div>
  );
}
