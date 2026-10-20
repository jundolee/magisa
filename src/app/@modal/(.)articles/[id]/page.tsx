import { ArticlePreviewRoute } from "@/components/article-preview-route";

export default async function InterceptedArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArticlePreviewRoute articleId={id} />;
}
