"use client";

import { useTransition, type FormEvent } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { toggleArticleFavoriteAction } from "@/app/articles/actions";

export function FavoriteToggleForm({
  articleId,
  isFavorite,
  compact = false,
  onChange,
}: {
  articleId: string;
  isFavorite: boolean;
  compact?: boolean;
  onChange?: (articleId: string, nextFavorite: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const nextFavorite = !isFavorite;
    const formData = new FormData();
    formData.set("id", articleId);
    formData.set("nextFavorite", String(nextFavorite));
    onChange?.(articleId, nextFavorite);

    startTransition(async () => {
      try {
        const result = await toggleArticleFavoriteAction(formData);
        if (result === "unauthenticated") {
          onChange?.(articleId, isFavorite);
          const next = `${window.location.pathname}${window.location.search}`;
          window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        }
      } catch (error) {
        onChange?.(articleId, isFavorite);
        console.error("즐겨찾기 저장 실패:", error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isPending}>
      {compact ? (
        <button type="submit" className="article-save-button" aria-label={isFavorite ? "즐겨찾기 취소" : "즐겨찾기에 저장"} aria-pressed={isFavorite} disabled={isPending}>
          <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
        </button>
      ) : (
        <ActionButton type="submit" variant={isFavorite ? "brandOutline" : "ghost"} size="xsmall" disabled={isPending}>
          {isFavorite ? "★ 즐겨찾기" : "☆ 즐겨찾기"}
        </ActionButton>
      )}
    </form>
  );
}
