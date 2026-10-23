"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "seed-design/ui/action-button";
import { markAllArticlesReadAction } from "@/app/articles/actions";

export function ReadAllControls({ onMarkAllRead }: { onMarkAllRead: () => () => void }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (isPending) return;
    const rollback = onMarkAllRead();
    startTransition(async () => {
      try {
        const result = await markAllArticlesReadAction();
        if (result === "unauthenticated") {
          rollback();
          const next = `${window.location.pathname}${window.location.search}`;
          router.push(`/login?next=${encodeURIComponent(next)}`);
        }
      } catch (error) {
        rollback();
        console.error("모든 글 읽음 처리 실패:", error);
      }
    });
  }

  return (
    <ActionButton
      type="button"
      variant="ghost"
      size="xsmall"
      loading={isPending}
      onClick={handleClick}
    >
      모두 읽음
    </ActionButton>
  );
}
