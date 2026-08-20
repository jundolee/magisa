import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

// 관리자 전용 화면은 크롤러도 아예 들어오지 못하게 막는다 (페이지별 robots: noindex와 이중으로 방어).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/sources", "/admin-login"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
