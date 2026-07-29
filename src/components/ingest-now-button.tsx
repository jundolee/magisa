"use client";

import { useActionState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { ingestSourceNowAction, type IngestNowState } from "@/app/sources/actions";

const initialState: IngestNowState = { ok: true, message: "" };

export function IngestNowButton({ sourceId }: { sourceId: string }) {
  const [state, formAction, isPending] = useActionState(ingestSourceNowAction, initialState);

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}
    >
      <input type="hidden" name="id" value={sourceId} />
      <ActionButton type="submit" variant="neutralOutline" size="small" loading={isPending}>
        지금 수집
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
