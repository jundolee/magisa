import { ActionButton } from "seed-design/ui/action-button";
import { markArticleUnreadAction } from "@/app/articles/actions";

export function UnreadToggleForm({ articleId, compact = false }: { articleId: string; compact?: boolean }) {
  return (
    <form action={markArticleUnreadAction}>
      <input type="hidden" name="id" value={articleId} />
      {compact ? (
        <button type="submit" className="article-unread-button">읽지 않음으로 표시</button>
      ) : (
        <ActionButton type="submit" variant="ghost" size="xsmall">읽지 않음으로 표시</ActionButton>
      )}
    </form>
  );
}
