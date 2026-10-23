import { AspectRatio, Badge } from "@seed-design/react";
import { ArticleLink } from "./article-link";
import { UnreadToggleForm } from "./unread-toggle-form";
import { FavoriteToggleForm } from "./favorite-toggle-form";
import type { ArticleListItem } from "@/lib/data/articles";
import { getCategoryMeta, type CategoryId } from "@/lib/categories";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
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
    <li className={`article-row-item${article.is_read ? " is-read" : ""}`}>
      <div className="article-row-content">
        <div className="article-row-meta">
          <Badge size="medium" variant="weak" tone="neutral">
            <span className="article-row-source">
              {article.source?.favicon_url && (
                // eslint-disable-next-line @next/next/no-img-element -- 임의의 외부 도메인 파비콘
                <img src={article.source.favicon_url} alt="" width={14} height={14} loading="lazy" decoding="async" />
              )}
              <span>{article.source?.title ?? article.source?.site_url}</span>
            </span>
          </Badge>
          {category && (
            <button type="button" className="article-row-category" onClick={() => onSelectCategory?.(category.id)}>
              <Badge size="medium" variant="outline" tone={category.badgeTone}>{category.label}</Badge>
            </button>
          )}
          <div className="article-row-actions">
            {article.is_read && <UnreadToggleForm articleId={article.id} compact />}
            <FavoriteToggleForm articleId={article.id} isFavorite={article.is_favorite} compact />
          </div>
        </div>

        <div className={`article-row-main${article.thumbnail_url ? " has-thumbnail" : ""}`}>
          <div className="article-row-copy">
            <ArticleLink articleId={article.id} articleTitle={article.title} href={href}
              className="article-row-link" onRead={onRead}>
              <h3>{article.title}</h3>
            </ArticleLink>
            {article.excerpt && (
              <ArticleLink articleId={article.id} articleTitle={article.title} href={href}
                className="article-row-excerpt" onRead={onRead}>
                <p>{article.excerpt}</p>
              </ArticleLink>
            )}
            <time className="article-row-date">{formatDate(article.published_at)}</time>
          </div>
          {article.thumbnail_url && (
            <ArticleLink articleId={article.id} articleTitle={article.title} href={href}
              className="article-row-thumb" onRead={onRead}>
              <AspectRatio ratio={4 / 3} className="article-row-thumb-aspect" width="144px"
                style={{ borderRadius: 8, overflow: "hidden", background: "var(--seed-color-bg-neutral-weak)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 외부 블로그 썸네일 */}
                <img src={article.thumbnail_url} alt="" loading={priority ? "eager" : "lazy"}
                  fetchPriority={priority ? "high" : "auto"} decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "contain", opacity: article.is_read ? 0.85 : 1 }} />
              </AspectRatio>
            </ArticleLink>
          )}
        </div>
      </div>
    </li>
  );
}
