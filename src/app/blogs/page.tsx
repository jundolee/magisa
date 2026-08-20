import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { SITE_URL, getPublicBlogIndex } from "@/lib/data/public-hubs";

// 공개 허브는 Supabase 읽기 모듈을 함께 번들링하므로 기본 Node.js 런타임을 사용한다.
export const runtime = "nodejs";
// 공개 소스와 글은 public-hubs 내부의 force-cache 조회를 통해 제공한다.
export const fetchCache = "default-cache";

const CANONICAL_URL = `${SITE_URL}/blogs`;
const TITLE = "구독 테크 블로그 | Magisa";
const DESCRIPTION = "Magisa가 수집하는 활성 테크 블로그를 한곳에서 둘러보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL_URL, type: "website", locale: "ko_KR" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default async function BlogsPage() {
  // 빌드 환경에 데이터베이스 자격 증명이 없어도, 배포 요청 시점의 캐시된 공개 데이터를 렌더링한다.
  await connection();
  const blogs = await getPublicBlogIndex();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL_URL,
    isPartOf: { "@type": "WebSite", name: "Magisa", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: blogs.map((blog, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: blog.displayName,
        url: `${CANONICAL_URL}/${encodeURIComponent(blog.slug)}`,
      })),
    },
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PageHeader navHref="/" navLabel="전체 글" />

      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">구독 테크 블로그</Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
          Magisa가 현재 수집 중인 블로그를 찾아보고, 블로그별 최신 글을 확인하세요.
        </Text>
      </header>

      <section aria-labelledby="blog-list">
        <Text as="h2" id="blog-list" textStyle="t6Bold" color="fg.neutral" style={{ marginBottom: 16 }}>
          활성 블로그 ({blogs.length})
        </Text>
        {blogs.length === 0 ? (
          <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
            현재 공개된 블로그가 없습니다.
          </Text>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none" }}>
            {blogs.map((blog) => (
              <li key={blog.slug}>
                <Link
                  href={`/blogs/${encodeURIComponent(blog.slug)}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    padding: 16,
                    border: "1px solid var(--seed-color-stroke-neutral-subtle)",
                    borderRadius: 12,
                  }}
                >
                  <Text as="h3" textStyle="t5Bold" color="fg.neutral">{blog.displayName}</Text>
                  <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">{blog.host}</Text>
                  <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
                    {blog.latestArticleTitle ? `최근 글: ${blog.latestArticleTitle}` : "수집된 글을 기다리고 있습니다."}
                  </Text>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
