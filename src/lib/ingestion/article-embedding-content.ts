import { createHash } from "node:crypto";

export interface ArticleEmbeddingContent {
  title: string;
  excerpt: string | null;
  category: string | null;
  tags: string[] | null;
}

export function buildArticleEmbeddingText(article: ArticleEmbeddingContent): string {
  return [
    `제목: ${article.title.trim()}`,
    article.excerpt?.trim() ? `요약: ${article.excerpt.trim()}` : "",
    article.category ? `주제: ${article.category}` : "",
    article.tags?.length ? `태그: ${article.tags.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Must match the md5 expression in migration 0017 so the outbox can reject stale work. */
export function hashArticleEmbeddingContent(article: ArticleEmbeddingContent): string {
  return createHash("md5")
    .update([
      article.title,
      article.excerpt ?? "",
      article.category ?? "general",
      article.tags?.join(",") ?? "",
    ].join("\n"))
    .digest("hex");
}
