import { notFound } from "next/navigation";
import { ArticlePreviewPanel } from "@/components/article-preview-panel";
import { getArticlePreview, getRelatedArticles } from "@/lib/data/related-articles";

export async function ArticlePreviewRoute({ articleId }: { articleId: string }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) notFound();

  // 기사 정보와 Pinecone 연관 글 조회를 병렬로 시작하여 대기 시간을 대폭 단축
  const articlePromise = getArticlePreview(articleId);
  const relatedPromise = getRelatedArticles(articleId);

  const [article, initialRelated] = await Promise.all([articlePromise, relatedPromise]);
  if (!article) notFound();

  const related = initialRelated.length > 0
    ? initialRelated
    : await getRelatedArticles(article.id, article.category, article.tags);

  return <ArticlePreviewPanel article={article} related={related} />;
}
