import { ActionButton } from "seed-design/ui/action-button";
import { markArticleUnreadAction } from "@/app/articles/actions";

export function UnreadToggleForm({ articleId }: { articleId: string }) {
  return (
    <form action={markArticleUnreadAction}>
      <input type="hidden" name="id" value={articleId} />
      <ActionButton type="submit" variant="ghost" size="xsmall">
        안읽음으로 표시
      </ActionButton>
    </form>
  );
}
