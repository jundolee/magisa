"use client";

import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

export function PaginationControls({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 32 }}>
      <ActionButton
        type="button"
        variant="neutralOutline"
        size="small"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        이전
      </ActionButton>
      <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
        {page} / {totalPages}
      </Text>
      <ActionButton
        type="button"
        variant="neutralOutline"
        size="small"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        다음
      </ActionButton>
    </div>
  );
}
