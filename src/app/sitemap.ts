import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getCachedArticleFeed } from "@/lib/data/articles";
import { getPublicBlogIndex, getPublicCategoryIndex } from "@/lib/data/public-hubs";
import { listRecentDigestWeeks } from "@/lib/data/weekly-digests";
import { SITE_URL } from "./seo";

function latestContentDate<T extends { discovered_at?: string | null; published_at?: string | null }>(
  items: T[]
): string | undefined {
  return items
    .map((item) => item.discovered_at ?? item.published_at ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

function latestDate(values: Array<string | null>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

// /suggest와 관리자 화면은 noindex이므로 제외한다. 실제 내용이 없는 블로그 허브도 sitemap에서 제외한다.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 공개 데이터와 실제 수집 시각을 사용해 페이지별 lastmod를 계산한다.
  await connection();
  const [digestWeeks, feed, blogs, topics] = await Promise.all([
    listRecentDigestWeeks(),
    getCachedArticleFeed(),
    getPublicBlogIndex(),
    getPublicCategoryIndex(),
  ]);
  const blogIndexLastModified = latestDate(blogs.map((blog) => blog.lastModified));

  return [
    {
      url: SITE_URL,
      lastModified: latestContentDate(feed),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/topics`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...topics.map((topic) => ({
      url: `${SITE_URL}/topics/${topic.category}`,
      lastModified: topic.lastModified ?? undefined,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    {
      url: `${SITE_URL}/blogs`,
      lastModified: blogIndexLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...blogs.filter((blog) => blog.hasArticles).map((blog) => ({
      url: `${SITE_URL}/blogs/${encodeURIComponent(blog.slug)}`,
      lastModified: blog.lastModified ?? undefined,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/digest`,
      lastModified: latestDate(digestWeeks.map((digest) => digest.lastModified)),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...digestWeeks.map((digest) => ({
      url: `${SITE_URL}/digest/${digest.week}`,
      lastModified: digest.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
