"use client";

import { useTransition } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { markAllArticlesReadAction, markAllArticlesUnreadAction } from "@/app/articles/actions";

export function ReadAllControls() {
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", gap: 4 }}>
      <ActionButton
        type="button"
        variant="ghost"
        size="xsmall"
        loading={isPending}
        onClick={() => startTransition(async () => { await markAllArticlesReadAction(); })}
      >
        전체 읽음
      </ActionButton>
      <ActionButton
        type="button"
        variant="ghost"
        size="xsmall"
        loading={isPending}
        onClick={() => startTransition(async () => { await markAllArticlesUnreadAction(); })}
      >
        전체 안읽음
      </ActionButton>
    </div>
  );
}
