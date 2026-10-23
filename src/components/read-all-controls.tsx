"use client";

import { useTransition } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { markAllArticlesReadAction } from "@/app/articles/actions";

export function ReadAllControls() {
  const [isPending, startTransition] = useTransition();

  return (
    <ActionButton
      type="button"
      variant="ghost"
      size="xsmall"
      loading={isPending}
      onClick={() => startTransition(async () => { await markAllArticlesReadAction(); })}
    >
      모두 읽음
    </ActionButton>
  );
}
