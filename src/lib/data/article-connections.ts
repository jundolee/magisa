import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCachedRpcFromSupabase } from "@/lib/supabase/cached-rest";
import { isPineconeConfigured } from "@/lib/pinecone/article-index";

export interface ArticleDetails {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  published_at: string | null;
  category: string;
  tags: string[];
  source: {
    id: string;
    title: string | null;
    site_url: string;
    favicon_url: string | null;
  };
}

export type RelatedArticlesStatus = "unconfigured" | "pending" | "failed" | "unavailable" | "ready";

export interface RelatedArticlesResult {
  status: RelatedArticlesStatus;
  articles: RelatedArticle[];
}

export interface RelatedArticle extends ArticleDetails {
  similarityScore: number;
}

interface ArticleDetailsRow extends Omit<ArticleDetails, "source"> {
  source: (ArticleDetails["source"] & { is_active: boolean }) | (ArticleDetails["source"] & { is_active: boolean })[] | null;
}

interface RelatedArticleRpcRow {
  article_status: string;
  related_article_id: string | null;
  score: number | null;
  title: string | null;
  url: string | null;
  excerpt: string | null;
  published_at: string | null;
  category: string | null;
  tags: string[] | null;
  source_id: string | null;
  source_title: string | null;
  source_site_url: string | null;
  source_favicon_url: string | null;
}

/** Full article metadata for the internal connection page; the original body stays external. */
export async function getArticleDetails(articleId: string): Promise<ArticleDetails | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id,title,url,excerpt,published_at,category,tags,source:sources(id,title,site_url,favicon_url,is_active)"
    )
    .eq("id", articleId)
    .maybeSingle();
  if (error) throw error;

  const row = data as unknown as ArticleDetailsRow | null;
  const rawSource = Array.isArray(row?.source) ? row.source[0] : row?.source;
  if (!row || !rawSource?.is_active) return null;
  return {
    ...row,
    source: {
      id: rawSource.id,
      title: rawSource.title,
      site_url: rawSource.site_url,
      favicon_url: rawSource.favicon_url,
    },
  };
}

/** Read precomputed Pinecone candidates through the existing shared Data Cache. */
export async function getRelatedArticles(articleId: string, limit = 5): Promise<RelatedArticlesResult> {
  const pineconeConfigured = isPineconeConfigured();
  try {
    const rows = await fetchCachedRpcFromSupabase<RelatedArticleRpcRow[]>("get_article_related_candidates", {
      requested_article_id: articleId,
      requested_limit: String(Math.min(Math.max(Math.trunc(limit), 1), 10)),
    }, { revalidate: 300, tags: ["article-related-candidates", "articles"] });

    if (rows.length === 0) return { status: pineconeConfigured ? "pending" : "unconfigured", articles: [] };
    const currentStatus = rows[0].article_status;
    if (currentStatus === "pending" || currentStatus === "processing") {
      return { status: pineconeConfigured ? "pending" : "unconfigured", articles: [] };
    }
    if (currentStatus === "failed") return { status: "failed", articles: [] };

    const articles: RelatedArticle[] = rows.flatMap((row) => {
      if (!row.related_article_id || !row.title || !row.url || !row.source_id || !row.source_site_url) return [];
      return [{
        id: row.related_article_id,
        title: row.title,
        url: row.url,
        excerpt: row.excerpt,
        published_at: row.published_at,
        category: row.category ?? "general",
        tags: row.tags ?? [],
        similarityScore: row.score ?? 0,
        source: {
          id: row.source_id,
          title: row.source_title,
          site_url: row.source_site_url,
          favicon_url: row.source_favicon_url,
        },
      }];
    });
    return { status: "ready", articles };
  } catch (cause) {
    console.error("Related article lookup failed:", cause instanceof Error ? cause.name : "unknown error");
    return { status: "unavailable", articles: [] };
  }
}
