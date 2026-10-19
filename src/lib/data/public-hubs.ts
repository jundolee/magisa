import "server-only";
import { CATEGORIES, type ArticleCategory } from "@/lib/categories";
import { getCachedArticlesForSource, type ArticleListItem } from "@/lib/data/articles";
import { listSources, type Source } from "@/lib/data/sources";
import { fetchCachedRpcFromSupabase } from "@/lib/supabase/cached-rest";
import { SITE_URL } from "@/app/seo";

const MAX_HUB_ARTICLES = 20;

export { SITE_URL };

export const PUBLIC_CATEGORY_IDS = CATEGORIES.filter((category) => category.id !== "all").map(
  (category) => category.id
) as ArticleCategory[];

export interface PublicCategoryMeta {
  label: string;
  title: string;
  description: string;
}

// 검색어가 가리키는 주제와 페이지의 실제 내용을 맞추기 위해 카테고리별 설명을 따로 둔다.
// id는 수집 파이프라인이 저장하는 표준 category 값과 동일하다.
export const PUBLIC_CATEGORY_META: Record<ArticleCategory, PublicCategoryMeta> = {
  frontend: {
    label: "Frontend",
    title: "프론트엔드 최신 글",
    description: "React, 웹 플랫폼, 디자인 시스템과 프론트엔드 개발 경험에 관한 최신 글을 모았습니다.",
  },
  backend: {
    label: "Backend",
    title: "백엔드 최신 글",
    description: "서버, API, 데이터베이스와 안정적인 서비스 운영을 다루는 최신 백엔드 글을 모았습니다.",
  },
  ai_ml: {
    label: "AI / ML",
    title: "AI · 머신러닝 최신 글",
    description: "생성형 AI, 머신러닝 모델, 데이터 기반 제품 개발에 관한 최신 글을 모았습니다.",
  },
  devops: {
    label: "DevOps",
    title: "DevOps 최신 글",
    description: "클라우드, 인프라, 배포 자동화와 신뢰성 있는 운영에 관한 최신 글을 모았습니다.",
  },
  mobile: {
    label: "Mobile",
    title: "모바일 개발 최신 글",
    description: "iOS, Android, 크로스 플랫폼과 모바일 제품 개발에 관한 최신 글을 모았습니다.",
  },
  data: {
    label: "Data",
    title: "데이터 최신 글",
    description: "데이터 엔지니어링, 분석, 실험과 데이터 플랫폼에 관한 최신 글을 모았습니다.",
  },
  culture: {
    label: "Culture",
    title: "개발 문화 최신 글",
    description: "팀의 일하는 방식, 커리어, 협업과 기술 조직 문화에 관한 최신 글을 모았습니다.",
  },
  general: {
    label: "General",
    title: "테크 최신 글",
    description: "특정 주제로 분류되지 않은 기술 소식과 개발 이야기를 모았습니다.",
  },
};

export interface PublicHubArticle {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  publishedAt: string | null;
  discoveredAt: string | null;
  category: ArticleCategory;
  source: {
    title: string;
    slug: string;
  } | null;
}

export interface PublicCategoryHub {
  category: ArticleCategory;
  meta: PublicCategoryMeta;
  articles: PublicHubArticle[];
  lastModified: string | null;
}

export interface PublicCategoryIndexItem {
  category: ArticleCategory;
  meta: PublicCategoryMeta;
  articleCount: number;
  lastModified: string | null;
}

export interface PublicBlogHub {
  source: Source;
  slug: string;
  host: string;
  displayName: string;
  articles: PublicHubArticle[];
  categories: ArticleCategory[];
}

export interface PublicBlogIndexItem {
  slug: string;
  displayName: string;
  host: string;
  latestArticleTitle: string | null;
  hasArticles: boolean;
  lastModified: string | null;
}

function hostFromUrl(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}

function slugPart(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "blog";
}

/**
 * UUID처럼 관리용 식별자를 URL에 노출하지 않고, 방문자가 이해할 수 있는 제목과 호스트만으로
 * 같은 소스에 언제나 같은 공개 주소를 만든다. 호스트가 함께 들어가 제목이 같은 블로그도 구분된다.
 */
export function getPublicSourceSlug(source: Pick<Source, "title" | "site_url">): string {
  const host = hostFromUrl(source.site_url);
  const title = source.title?.trim() || host;
  const titlePart = slugPart(title);
  const hostPart = slugPart(host);
  return titlePart === hostPart ? hostPart : `${titlePart}-${hostPart}`;
}

function matchesPublicSourceSlug(source: Source, requestedSlug: string): boolean {
  const publicSlug = getPublicSourceSlug(source);
  if (publicSlug === requestedSlug) return true;

  // Vercel may pass a percent-encoded dynamic path parameter through to the page.
  // Compare its decoded form too so non-ASCII slugs (for example Korean blog names)
  // resolve consistently with the URLs emitted by the sitemap and blog index.
  if (!/%[\da-f]{2}/i.test(requestedSlug)) return false;
  try {
    return publicSlug === decodeURIComponent(requestedSlug);
  } catch {
    return false;
  }
}

export function isPublicCategory(value: string): value is ArticleCategory {
  return PUBLIC_CATEGORY_IDS.includes(value as ArticleCategory);
}

function toPublicArticle(
  article: Omit<ArticleListItem, "is_read" | "is_favorite">,
  sourceSlugs: Map<string, string>
): PublicHubArticle {
  const category = isPublicCategory(article.category) ? article.category : "general";
  const sourceTitle = article.source?.title?.trim() || article.source?.site_url || null;

  return {
    id: article.id,
    title: article.title,
    url: article.url,
    excerpt: article.excerpt,
    publishedAt: article.published_at,
    discoveredAt: article.discovered_at ?? null,
    category,
    source:
      article.source && sourceTitle
        ? {
            title: sourceTitle,
            slug: sourceSlugs.get(article.source.id) ?? getPublicSourceSlug(article.source),
          }
        : null,
  };
}

interface PublicBlogIndexRow {
  source_id: string;
  latest_article_title: string | null;
  has_articles: boolean;
  last_modified: string | null;
}

interface PublicCategoryIndexRow {
  category_id: string;
  article_count: number;
  last_modified: string | null;
}

interface PublicCategoryArticleRow {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  published_at: string | null;
  discovered_at: string | null;
  category: string;
  source_id: string;
  source_title: string | null;
  source_site_url: string;
}

export async function getPublicBlogIndex(): Promise<PublicBlogIndexItem[]> {
  const [allSources, articleIndex] = await Promise.all([
    listSources(),
    fetchCachedRpcFromSupabase<PublicBlogIndexRow[]>("get_public_blog_index", {}, {
      revalidate: 60,
      tags: ["articles", "sources"],
    }),
  ]);
  const sources = allSources.filter((source) => source.is_active);
  const latestBySource = new Map(articleIndex.map((row) => [row.source_id, row]));

  return sources
    .map((source) => {
      const latestArticle = latestBySource.get(source.id);
      return {
        slug: getPublicSourceSlug(source),
        displayName: source.title?.trim() || hostFromUrl(source.site_url),
        host: hostFromUrl(source.site_url),
        latestArticleTitle: latestArticle?.latest_article_title ?? null,
        hasArticles: latestArticle?.has_articles ?? false,
        lastModified: latestArticle?.last_modified ?? null,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
}

export async function getPublicCategoryIndex(): Promise<PublicCategoryIndexItem[]> {
  const rows = await fetchCachedRpcFromSupabase<PublicCategoryIndexRow[]>("get_public_category_index", {}, {
    revalidate: 60,
    tags: ["articles", "sources"],
  });
  const byCategory = new Map(rows.map((row) => [row.category_id, row]));

  return PUBLIC_CATEGORY_IDS.flatMap((category) => {
    const row = byCategory.get(category);
    return row
      ? [{ category, meta: PUBLIC_CATEGORY_META[category], articleCount: Number(row.article_count), lastModified: row.last_modified }]
      : [];
  });
}

export async function getPublicCategoryHub(category: string): Promise<PublicCategoryHub | null> {
  if (!isPublicCategory(category)) return null;

  const [rows, sources] = await Promise.all([
    fetchCachedRpcFromSupabase<PublicCategoryArticleRow[]>("get_public_category_articles", {
      category_id: category,
      requested_limit: String(MAX_HUB_ARTICLES),
    }, { revalidate: 60, tags: ["articles", "sources"] }),
    listSources(),
  ]);
  const sourceSlugs = new Map(
    sources.filter((source) => source.is_active).map((source) => [source.id, getPublicSourceSlug(source)])
  );
  const articles = rows.map((article) => {
    const categoryId = isPublicCategory(article.category) ? article.category : "general";
    const sourceTitle = article.source_title?.trim() || article.source_site_url;
    return {
      id: article.id,
      title: article.title,
      url: article.url,
      excerpt: article.excerpt,
      publishedAt: article.published_at,
      discoveredAt: article.discovered_at,
      category: categoryId,
      source: {
        title: sourceTitle,
        slug: sourceSlugs.get(article.source_id) ?? getPublicSourceSlug({
          title: article.source_title,
          site_url: article.source_site_url,
        }),
      },
    } satisfies PublicHubArticle;
  });

  const lastModified = articles.reduce<string | null>((latest, article) => {
    const candidate = article.discoveredAt ?? article.publishedAt;
    return candidate && (!latest || Date.parse(candidate) > Date.parse(latest)) ? candidate : latest;
  }, null);

  return {
    category,
    meta: PUBLIC_CATEGORY_META[category],
    articles,
    lastModified,
  };
}

export async function getPublicBlogHub(slug: string): Promise<PublicBlogHub | null> {
  const sources = (await listSources()).filter((source) => source.is_active);
  const source = sources.find((item) => matchesPublicSourceSlug(item, slug));
  if (!source) return null;

  const sourceArticles = await getCachedArticlesForSource(source.id, MAX_HUB_ARTICLES);
  const sourceSlugs = new Map(sources.map((item) => [item.id, getPublicSourceSlug(item)]));
  const categories = Array.from(
    new Set(sourceArticles.map((article) => (isPublicCategory(article.category) ? article.category : "general")))
  );

  return {
    source,
    slug: getPublicSourceSlug(source),
    host: hostFromUrl(source.site_url),
    displayName: source.title?.trim() || hostFromUrl(source.site_url),
    articles: sourceArticles.slice(0, MAX_HUB_ARTICLES).map((article) => toPublicArticle(article, sourceSlugs)),
    categories,
  };
}
