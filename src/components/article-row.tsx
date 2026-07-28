import { ArticleLink } from "./article-link";
import { UnreadToggleForm } from "./unread-toggle-form";
import type { ArticleListItem } from "@/lib/data/articles";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function ArticleRow({ article }: { article: ArticleListItem }) {
  return (
    <li
      style={{
        display: "flex",
        gap: 16,
        padding: 16,
        border: "1px solid var(--seed-color-stroke-neutral)",
        borderRadius: 8,
        opacity: article.is_read ? 0.6 : 1,
      }}
    >
      {article.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element -- 임의의 외부 도메인 썸네일이라 next/image 최적화 대상 밖
        <img
          src={article.thumbnail_url}
          alt=""
          width={96}
          height={96}
          style={{ objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--seed-color-fg-neutral-muted)" }}>
          {article.source?.title ?? article.source?.site_url} · {formatDate(article.published_at)}
        </div>
        <ArticleLink articleId={article.id} href={article.url}>
          <strong>{article.title}</strong>
        </ArticleLink>
        {article.excerpt && <p style={{ fontSize: 14 }}>{article.excerpt}</p>}
        {article.is_read && <UnreadToggleForm articleId={article.id} />}
      </div>
    </li>
  );
}
