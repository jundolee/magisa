import "server-only";
import { CATEGORIES, type ArticleCategory } from "@/lib/categories";
import { getCachedArticleFeed, type ArticleListItem } from "@/lib/data/articles";
import { listSources, type Source } from "@/lib/data/sources";

const MAX_HUB_ARTICLES = 20;

export const SITE_URL = "https://magisa.vercel.app";

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
  articleCount: number;
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

async function getCachedPublicHubData() {
  // 두 데이터 소스 모두 force-cache + revalidate/tags 기반의 읽기 전용 조회다.
  // 이 레이어에서 service client를 새로 만들지 않아 공개 페이지도 서비스 키 요청을 캐시로 흡수한다.
  const [allSources, allArticles] = await Promise.all([listSources(), getCachedArticleFeed()]);
  // 일시중지한 소스는 공개 블로그 목록뿐 아니라 주제와 개별 허브의 글에서도 숨긴다.
  // 먼저 활성 소스 ID를 확정해야 조인된 article.source만으로 비활성 글이 새는 일을 막을 수 있다.
  const sources = allSources.filter((source) => source.is_active);
  const sourceIds = new Set(sources.map((source) => source.id));
  const articles = allArticles.filter((article) => article.source && sourceIds.has(article.source.id));
  const sourceSlugs = new Map(sources.map((source) => [source.id, getPublicSourceSlug(source)]));
  return { sources, articles, sourceSlugs };
}

export async function getPublicBlogIndex(): Promise<PublicBlogIndexItem[]> {
  const { sources, articles } = await getCachedPublicHubData();
  const articleGroups = new Map<string, Omit<ArticleListItem, "is_read" | "is_favorite">[]>();

  for (const article of articles) {
    if (!article.source) continue;
    const group = articleGroups.get(article.source.id) ?? [];
    group.push(article);
    articleGroups.set(article.source.id, group);
  }

  return sources
    .map((source) => {
      const sourceArticles = articleGroups.get(source.id) ?? [];
      return {
        slug: getPublicSourceSlug(source),
        displayName: source.title?.trim() || hostFromUrl(source.site_url),
        host: hostFromUrl(source.site_url),
        latestArticleTitle: sourceArticles[0]?.title ?? null,
        articleCount: sourceArticles.length,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
}

export async function getPublicCategoryHub(category: string): Promise<PublicCategoryHub | null> {
  if (!isPublicCategory(category)) return null;

  const { articles, sourceSlugs } = await getCachedPublicHubData();
  return {
    category,
    meta: PUBLIC_CATEGORY_META[category],
    articles: articles
      .filter((article) => article.category === category)
      .slice(0, MAX_HUB_ARTICLES)
      .map((article) => toPublicArticle(article, sourceSlugs)),
  };
}

export async function getPublicBlogHub(slug: string): Promise<PublicBlogHub | null> {
  const { sources, articles, sourceSlugs } = await getCachedPublicHubData();
  const source = sources.find((item) => getPublicSourceSlug(item) === slug);
  if (!source) return null;

  const sourceArticles = articles.filter((article) => article.source?.id === source.id);
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
