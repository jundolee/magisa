import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { PUBLIC_CATEGORY_IDS, getPublicSourceSlug } from "@/lib/data/public-hubs";
import { listSources } from "@/lib/data/sources";
import { listRecentDigestWeeks } from "@/lib/data/weekly-digests";
import { SITEMAP_LAST_MODIFIED, SITE_URL } from "./seo";

// /suggest와 관리자 화면은 noindex이므로 제외한다. 실제 검색 진입점인 주제·블로그·주간 큐레이션만 등록한다.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 로컬/CI 빌드에서 Supabase를 요구하지 않고, 배포 요청에서만 공개 URL 목록을 계산한다.
  // 데이터 조회 자체는 각각의 force-cache 설정으로 캐시된다.
  await connection();
  const [sources, digestWeeks] = await Promise.all([listSources(), listRecentDigestWeeks()]);
  const activeSources = sources.filter((source) => source.is_active);

  return [
    {
      url: SITE_URL,
      lastModified: SITEMAP_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/topics`,
      lastModified: SITEMAP_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...PUBLIC_CATEGORY_IDS.map((category) => ({
      url: `${SITE_URL}/topics/${category}`,
      lastModified: SITEMAP_LAST_MODIFIED,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    {
      url: `${SITE_URL}/blogs`,
      lastModified: SITEMAP_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...activeSources.map((source) => ({
      url: `${SITE_URL}/blogs/${encodeURIComponent(getPublicSourceSlug(source))}`,
      lastModified: SITEMAP_LAST_MODIFIED,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/digest`,
      lastModified: SITEMAP_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...digestWeeks.map((digest) => ({
      url: `${SITE_URL}/digest/${digest.week}`,
      lastModified: SITEMAP_LAST_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
