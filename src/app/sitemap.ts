import type { MetadataRoute } from "next";

const SITE_URL = "https://magisa.vercel.app";

// /sources, /admin-login은 관리자 전용이라 제외. /suggest는 누구나 접근 가능한 공개 페이지라 포함.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/suggest`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
