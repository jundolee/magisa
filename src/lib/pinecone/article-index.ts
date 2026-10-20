import "server-only";
import { Pinecone } from "@pinecone-database/pinecone";
import { buildArticleEmbeddingText } from "@/lib/ingestion/article-embedding-content";

export const ARTICLE_EMBEDDING_MODEL = "multilingual-e5-large";
export const ARTICLE_VECTOR_NAMESPACE = "techgotgan-articles-v1";

export interface ArticleEmbeddingInput {
  article_id: string;
  title: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  source_id: string;
  content_hash: string;
}

interface ArticleVectorMetadata {
  [key: string]: string | number | boolean | string[];
  embedding_text: string;
  title: string;
  category: string;
  tags: string[];
  source_id: string;
  content_hash: string;
}

export interface RelatedArticleId {
  id: string;
  score: number;
}

let pineconeClient: Pinecone | null = null;

export function isPineconeConfigured(): boolean {
  return Boolean(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_HOST);
}

function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY;
  const host = process.env.PINECONE_INDEX_HOST?.trim();
  if (!apiKey || !host) return null;

  pineconeClient ??= new Pinecone({ apiKey });
  return pineconeClient.index<ArticleVectorMetadata>({
    host,
    namespace: ARTICLE_VECTOR_NAMESPACE,
  });
}

export function pineconeErrorMessage(cause: unknown): string {
  const raw = cause instanceof Error ? `${cause.name}: ${cause.message}` : "Pinecone request failed";
  const apiKey = process.env.PINECONE_API_KEY;
  return (apiKey ? raw.split(apiKey).join("[redacted]") : raw).slice(0, 500);
}

export async function upsertArticleEmbeddings(articles: ArticleEmbeddingInput[]): Promise<void> {
  if (articles.length === 0) return;
  const index = getPineconeIndex();
  if (!index) throw new Error("Pinecone is not configured");

  await index.upsertRecords({
    records: articles.map((article) => ({
      id: article.article_id,
      embedding_text: buildArticleEmbeddingText(article),
      title: article.title,
      category: article.category,
      tags: article.tags,
      source_id: article.source_id,
      content_hash: article.content_hash,
    })),
  });
}

export async function findRelatedArticleIds(articleId: string, topK = 12): Promise<RelatedArticleId[]> {
  const index = getPineconeIndex();
  if (!index) return [];

  const result = await index.searchRecords({
    query: { id: articleId, topK },
    fields: ["category"],
  });

  return result.result.hits
    .filter((hit) => hit._id !== articleId)
    .map((hit) => ({ id: hit._id, score: hit._score }));
}

export async function deleteArticleVectors(articleIds: string[]): Promise<void> {
  if (articleIds.length === 0) return;
  const index = getPineconeIndex();
  if (!index) throw new Error("Pinecone is not configured");
  await index.deleteMany({ ids: articleIds });
}
