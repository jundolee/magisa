import type { MetadataRoute } from "next";

const SITE_URL = "https://magisa.vercel.app";

// 공개 페이지가 홈 하나뿐이라 사이트맵도 단순하게 유지한다. /sources, /admin-login은 관리자 전용이라 제외.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
