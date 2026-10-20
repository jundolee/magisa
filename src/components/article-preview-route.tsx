import { notFound } from "next/navigation";
import { ArticlePreviewPanel } from "@/components/article-preview-panel";
import { getArticlePreview, getRelatedArticles } from "@/lib/data/related-articles";

export async function ArticlePreviewRoute({ articleId }: { articleId: string }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) notFound();
  const article = await getArticlePreview(articleId);
  if (!article) notFound();
  const related = await getRelatedArticles(article.id, article.category, article.tags);
  return <ArticlePreviewPanel article={article} related={related} />;
}
