import { ActionButton } from "seed-design/ui/action-button";
import { toggleArticleFavoriteAction } from "@/app/articles/actions";

export function FavoriteToggleForm({
  articleId,
  isFavorite,
  compact = false,
}: {
  articleId: string;
  isFavorite: boolean;
  compact?: boolean;
}) {
  return (
    <form action={toggleArticleFavoriteAction}>
      <input type="hidden" name="id" value={articleId} />
      <input type="hidden" name="nextFavorite" value={(!isFavorite).toString()} />
      {compact ? (
        <button type="submit" className="article-save-button" aria-label={isFavorite ? "즐겨찾기 취소" : "즐겨찾기에 저장"} aria-pressed={isFavorite}>
          <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
        </button>
      ) : (
        <ActionButton type="submit" variant={isFavorite ? "brandOutline" : "ghost"} size="xsmall">
          {isFavorite ? "★ 즐겨찾기" : "☆ 즐겨찾기"}
        </ActionButton>
      )}
    </form>
  );
}
