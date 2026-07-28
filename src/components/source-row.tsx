"use client";

import { ActionButton } from "seed-design/ui/action-button";
import { toggleSourceActiveAction, deleteSourceAction } from "@/app/sources/actions";
import type { Source } from "@/lib/data/sources";

export function SourceRow({ source }: { source: Source }) {
  return (
    <li
      style={{
        border: "1px solid var(--seed-color-stroke-neutral)",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <div>
        <strong>{source.title ?? source.site_url}</strong>
        <div style={{ fontSize: 13, color: "var(--seed-color-fg-neutral-muted)" }}>
          {source.site_url} · {source.feed_type}
          {!source.is_active && " · 일시중지됨"}
        </div>
        {source.last_error && (
          <div style={{ fontSize: 13, color: "var(--seed-color-fg-critical)" }}>
            마지막 오류: {source.last_error}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <form action={toggleSourceActiveAction}>
          <input type="hidden" name="id" value={source.id} />
          <input type="hidden" name="nextActive" value={(!source.is_active).toString()} />
          <ActionButton type="submit" variant="neutralWeak" size="small">
            {source.is_active ? "일시중지" : "재개"}
          </ActionButton>
        </form>
        <form
          action={deleteSourceAction}
          onSubmit={(e) => {
            if (!confirm(`"${source.site_url}"을(를) 삭제할까요?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={source.id} />
          <ActionButton type="submit" variant="criticalSolid" size="small">
            삭제
          </ActionButton>
        </form>
      </div>
    </li>
  );
}
