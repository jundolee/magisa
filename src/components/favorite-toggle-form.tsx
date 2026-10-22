import { ActionButton } from "seed-design/ui/action-button";
import { toggleArticleFavoriteAction } from "@/app/articles/actions";

export function FavoriteToggleForm({ articleId, isFavorite }: { articleId: string; isFavorite: boolean }) {
  return (
    <form action={toggleArticleFavoriteAction}>
      <input type="hidden" name="id" value={articleId} />
      <input type="hidden" name="nextFavorite" value={(!isFavorite).toString()} />
      <ActionButton type="submit" variant={isFavorite ? "brandOutline" : "ghost"} size="xsmall">
        {isFavorite ? "★ 즐겨찾기" : "☆ 즐겨찾기"}
      </ActionButton>
    </form>
  );
}
