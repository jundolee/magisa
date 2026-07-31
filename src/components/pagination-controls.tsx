"use client";

import { ActionButton } from "seed-design/ui/action-button";

const VISIBLE_PAGES = 5;

function getPageWindow(page: number, totalPages: number): number[] {
  const start = Math.min(
    Math.max(page - Math.floor(VISIBLE_PAGES / 2), 1),
    Math.max(totalPages - VISIBLE_PAGES + 1, 1),
  );
  const end = Math.min(start + VISIBLE_PAGES - 1, totalPages);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

export function PaginationControls({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const pages = getPageWindow(page, totalPages);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 32 }}>
      <ActionButton
        type="button"
        variant="neutralOutline"
        size="small"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="이전 페이지"
      >
        ‹
      </ActionButton>
      {pages.map((p) => (
        <ActionButton
          key={p}
          type="button"
          variant={p === page ? "neutralSolid" : "ghost"}
          size="small"
          onClick={() => onChange(p)}
        >
          {p}
        </ActionButton>
      ))}
      <ActionButton
        type="button"
        variant="neutralOutline"
        size="small"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="다음 페이지"
      >
        ›
      </ActionButton>
    </div>
  );
}
