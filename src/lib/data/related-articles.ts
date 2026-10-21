import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCachedRpcFromSupabase } from "@/lib/supabase/cached-rest";
import {
  ARTICLE_SUMMARY_PROMPT_VERSION,
  LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION,
} from "@/lib/ingestion/article-summary";

export interface RelatedArticle {
  id: string;
  title: string;
  sourceTitle: string | null;
  category: string;
  publishedAt: string | null;
  similarityScore?: number | null;
  isSemanticMatch?: boolean;
}

export interface ArticlePreview {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  publishedAt: string | null;
  category: string;
  tags: string[];
  sourceTitle: string | null;
  summary: { lead: string; keyPoints: string[] } | null;
  summaryBasis: "full_article" | "partial_article" | "excerpt" | null;
  summaryStatus: "pending" | "processing" | "ready" | "unavailable" | "failed" | null;
}

interface RelatedArticleRow {
  id: string;
  title: string;
  category: string;
  tags: string[] | null;
  published_at: string | null;
  source:
    | { title: string | null }
    | { title: string | null }[]
    | null;
}

const MAX_RELATED_ARTICLES = 3;
const TAG_OVERLAP_CANDIDATE_LIMIT = 200;
const RELATED_ARTICLE_SELECT = "id,title,category,tags,published_at,source:sources(title)";

export async function getArticlePreview(articleId: string): Promise<ArticlePreview | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id,title,url,excerpt,published_at,category,tags,source:sources(title)")
    .eq("id", articleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const source = Array.isArray(data.source) ? data.source[0] : data.source;
  let summary: ArticlePreview["summary"] = null;
  let summaryBasis: ArticlePreview["summaryBasis"] = null;
  let summaryStatus: ArticlePreview["summaryStatus"] = null;
  const summaryResult = await supabase
    .from("article_summary_jobs")
    .select("status,lead,key_points,extraction_status,prompt_version")
    .eq("article_id", articleId)
    .in("prompt_version", [ARTICLE_SUMMARY_PROMPT_VERSION, LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION]);
  if (summaryResult.error) {
    if (summaryResult.error.code === "42P01") {
      console.warn("article_summary_jobs table is not installed yet; no article summary is available.");
    } else {
      console.error("Failed to read article summary:", summaryResult.error.message);
    }
  } else {
    const current = summaryResult.data?.find((row) => row.prompt_version === ARTICLE_SUMMARY_PROMPT_VERSION);
    const legacy = summaryResult.data?.find((row) => row.prompt_version === LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION);
    const currentReady = current?.status === "ready" && Array.isArray(current.key_points);
    const legacyReady = legacy?.status === "ready" && Array.isArray(legacy.key_points);
    const selected = currentReady ? current : legacyReady ? legacy : current;

    if (selected) {
      const allowedStatuses = ["pending", "processing", "ready", "unavailable", "failed"] as const;
      if (allowedStatuses.includes(selected.status as typeof allowedStatuses[number])) {
        summaryStatus = selected.status as ArticlePreview["summaryStatus"];
      }
      if (summaryStatus === "ready" && Array.isArray(selected.key_points)) {
        summary = {
          lead: selected.lead,
          keyPoints: selected.key_points.filter((point): point is string => typeof point === "string"),
        };
        summaryBasis = selected.prompt_version === LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION
          ? "excerpt"
          : selected.extraction_status === "partial" ? "partial_article" : "full_article";
      }
    }
  }

  return {
    id: data.id,
    title: data.title,
    url: data.url,
    excerpt: data.excerpt,
    publishedAt: data.published_at,
    category: data.category ?? "general",
    tags: data.tags ?? [],
    sourceTitle: source?.title ?? null,
    summary,
    summaryBasis,
    summaryStatus,
  };
}

function getSafeLimit(limit?: number): number {
  if (limit === undefined || !Number.isFinite(limit)) return MAX_RELATED_ARTICLES;
  return Math.min(MAX_RELATED_ARTICLES, Math.max(0, Math.trunc(limit)));
}

function getTagOverlapCount(articleTags: string[] | null, currentTags: Set<string>): number {
  if (!articleTags) return 0;
  return new Set(articleTags.filter((tag) => currentTags.has(tag))).size;
}

function comparePublishedAtDescending(
  left: string | null,
  right: string | null
): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;

  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (Number.isNaN(leftTime)) return Number.isNaN(rightTime) ? 0 : 1;
  if (Number.isNaN(rightTime)) return -1;
  return rightTime - leftTime;
}

function toRelatedArticle(row: RelatedArticleRow): RelatedArticle {
  const source = Array.isArray(row.source) ? row.source[0] : row.source;
  return {
    id: row.id,
    title: row.title,
    sourceTitle: source?.title ?? null,
    category: row.category,
    publishedAt: row.published_at,
  };
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

/**
 * Finds related articles, prioritizing Pinecone semantic similarity candidates.
 * Falls back to same-category articles with shared tags if semantic candidates are unavailable.
 */
export async function getRelatedArticles(
  articleId: string,
  category: string,
  tags?: string[] | null,
  limit?: number
): Promise<RelatedArticle[]> {
  const safeLimit = getSafeLimit(limit);
  if (safeLimit === 0) return [];

  // 1. Try reading Pinecone semantic similarity candidates from cached RPC
  try {
    const semanticRows = await fetchCachedRpcFromSupabase<RelatedArticleRpcRow[]>(
      "get_article_related_candidates",
      {
        requested_article_id: articleId,
        requested_limit: String(safeLimit),
      },
      { revalidate: 300, tags: ["article-related-candidates", "articles"] }
    );

    const validSemanticArticles: RelatedArticle[] = [];
    for (const row of semanticRows) {
      if (row.related_article_id && row.title && row.source_title) {
        validSemanticArticles.push({
          id: row.related_article_id,
          title: row.title,
          sourceTitle: row.source_title,
          category: row.category ?? "general",
          publishedAt: row.published_at,
          similarityScore: row.score,
          isSemanticMatch: true,
        });
      }
    }

    if (validSemanticArticles.length >= safeLimit) {
      return validSemanticArticles.slice(0, safeLimit);
    }
    if (validSemanticArticles.length > 0) {
      // If we have some semantic articles but fewer than safeLimit, we can use them
      // and fill the rest from tag/category fallback
      const seenIds = new Set(validSemanticArticles.map((a) => a.id));
      seenIds.add(articleId);

      const fallbackArticles = await getCategoryFallbackArticles(articleId, category, tags, safeLimit, seenIds);
      return [...validSemanticArticles, ...fallbackArticles].slice(0, safeLimit);
    }
  } catch (cause) {
    console.warn("Pinecone related article lookup failed; falling back to tag/category matching:", cause instanceof Error ? cause.message : "unknown");
  }

  // 2. Fallback to tag overlap + category matching
  return getCategoryFallbackArticles(articleId, category, tags, safeLimit, new Set([articleId]));
}

async function getCategoryFallbackArticles(
  articleId: string,
  category: string,
  tags: string[] | null | undefined,
  limit: number,
  excludeIds: Set<string>
): Promise<RelatedArticle[]> {
  const supabase = createServiceClient();
  const currentTags = new Set((tags ?? []).filter((tag) => tag.length > 0));
  const candidates: RelatedArticleRow[] = [];

  if (currentTags.size > 0) {
    const { data, error } = await supabase
      .from("articles")
      .select(RELATED_ARTICLE_SELECT)
      .eq("category", category)
      .neq("id", articleId)
      .overlaps("tags", [...currentTags])
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(TAG_OVERLAP_CANDIDATE_LIMIT);

    if (error) throw error;
    for (const row of (data ?? []) as unknown as RelatedArticleRow[]) {
      if (!excludeIds.has(row.id)) candidates.push(row);
    }
  }

  if (candidates.length < limit) {
    const { data, error } = await supabase
      .from("articles")
      .select(RELATED_ARTICLE_SELECT)
      .eq("category", category)
      .neq("id", articleId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(limit + excludeIds.size);

    if (error) throw error;
    const candidateIds = new Set(candidates.map((candidate) => candidate.id));
    for (const row of (data ?? []) as unknown as RelatedArticleRow[]) {
      if (!excludeIds.has(row.id) && !candidateIds.has(row.id)) candidates.push(row);
    }
  }

  candidates.sort((left, right) => {
    const overlapDifference =
      getTagOverlapCount(right.tags, currentTags) - getTagOverlapCount(left.tags, currentTags);
    if (overlapDifference !== 0) return overlapDifference;

    const dateDifference = comparePublishedAtDescending(left.published_at, right.published_at);
    if (dateDifference !== 0) return dateDifference;
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  });

  return candidates.slice(0, limit).map((row) => ({
    ...toRelatedArticle(row),
    isSemanticMatch: false,
  }));
}
