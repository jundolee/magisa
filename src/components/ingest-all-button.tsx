"use client";

import { useActionState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { ingestAllSourcesNowAction, type IngestAllState } from "@/app/sources/actions";

const initialState: IngestAllState = { ok: true, message: "" };

export function IngestAllButton() {
  const [state, formAction, isPending] = useActionState(ingestAllSourcesNowAction, initialState);

  return (
    <form action={formAction} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <ActionButton type="submit" variant="neutralOutline" size="small" loading={isPending}>
        전체 지금 수집
      </ActionButton>
      {state.message && (
        <span
          style={{
            fontSize: 12,
            color: state.ok ? "var(--seed-color-fg-positive)" : "var(--seed-color-fg-critical)",
          }}
        >
          {state.message}
        </span>
      )}
    </form>
  );
}
