"use client";

import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "seed-design/ui/action-button";
import { markArticleUnreadAction } from "@/app/articles/actions";

export function UnreadToggleForm({ articleId, compact = false, onReadChange }: {
  articleId: string;
  compact?: boolean;
  onReadChange?: (articleId: string, isRead: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const formData = new FormData();
    formData.set("id", articleId);
    onReadChange?.(articleId, false);

    startTransition(async () => {
      try {
        const result = await markArticleUnreadAction(formData);
        if (result === "unauthenticated") {
          onReadChange?.(articleId, true);
          const next = `${window.location.pathname}${window.location.search}`;
          router.push(`/login?next=${encodeURIComponent(next)}`);
        }
      } catch (error) {
        onReadChange?.(articleId, true);
        console.error("읽음 상태 변경 실패:", error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isPending}>
      {compact ? (
        <button type="submit" className="article-unread-button" disabled={isPending}>읽지 않음으로 표시</button>
      ) : (
        <ActionButton type="submit" variant="ghost" size="xsmall" disabled={isPending}>읽지 않음으로 표시</ActionButton>
      )}
    </form>
  );
}
