import { ArticleLink } from "./article-link";
import { UnreadToggleForm } from "./unread-toggle-form";
import { FavoriteToggleForm } from "./favorite-toggle-form";
import { ShareButton } from "./share-button";
import type { ArticleListItem } from "@/lib/data/articles";
import { getCategoryMeta, type CategoryId } from "@/lib/categories";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function ArticleRow({ article, onRead, onSelectCategory, priority = false }: {
  article: ArticleListItem;
  onRead?: (articleId: string) => void;
  onSelectCategory?: (categoryId: CategoryId) => void;
  priority?: boolean;
}) {
  const category = article.category && article.category !== "general" ? getCategoryMeta(article.category) : null;
  const href = `/articles/${encodeURIComponent(article.id)}`;

  return (
    <li className={`article-row-item feed-article${article.is_read ? " is-read" : ""}`}>
      <div className="feed-article-meta">
        <span className="feed-source-dot" aria-hidden="true" />
        <span className="feed-article-source">{article.source?.title ?? article.source?.site_url}</span>
        {category && <>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onSelectCategory?.(category.id)}>{category.label}</button>
        </>}
      </div>
      <div className="feed-article-main">
        <ArticleLink articleId={article.id} articleTitle={article.title} href={href}
          className="article-row-link feed-article-link" onRead={onRead}>
          <h3>{article.title}</h3>
          {article.excerpt && <p>{article.excerpt}</p>}
        </ArticleLink>
        {article.thumbnail_url && (
          <ArticleLink articleId={article.id} articleTitle={article.title} href={href}
            className="feed-article-thumb" onRead={onRead}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 외부 블로그 썸네일 */}
            <img src={article.thumbnail_url} alt="" loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"} decoding="async" width={88} height={88} />
          </ArticleLink>
        )}
      </div>
      <div className="feed-article-footer">
        <span>{formatDate(article.published_at)}{article.is_read && " · 읽음"}</span>
        <div className="feed-article-actions">
          <FavoriteToggleForm articleId={article.id} isFavorite={article.is_favorite} compact />
          <details className="feed-row-more">
            <summary aria-label={`${article.title} 추가 동작`}>⋯</summary>
            <div>
              <ShareButton title={article.title} url={article.url} />
              {article.is_read && <UnreadToggleForm articleId={article.id} />}
            </div>
          </details>
        </div>
      </div>
    </li>
  );
}
