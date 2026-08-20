import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { PUBLIC_CATEGORY_META, SITE_URL, getPublicBlogHub, type PublicHubArticle } from "@/lib/data/public-hubs";

// 공개 허브는 Supabase 읽기 모듈을 함께 번들링한다. Vercel Hobby의 Edge 함수 1MB 제한을
// 넘지 않도록 기본 Node.js 런타임에서 렌더링한다.
export const runtime = "nodejs";
// /sources 관리자 화면과 별도 공개 경로이며, 데이터는 캐시된 공개 읽기 모델을 재사용한다.
export const fetchCache = "default-cache";

type BlogPageProps = { params: Promise<{ slug: string }> };

function blogUrl(slug: string): string {
  return `${SITE_URL}/blogs/${encodeURIComponent(slug)}`;
}

function formatDate(iso: string | null): string | null {
  return iso ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso)) : null;
}

function ArticleList({ articles }: { articles: PublicHubArticle[] }) {
  if (articles.length === 0) {
    return <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">아직 수집된 글이 없습니다.</Text>;
  }

  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 16 }}>
      {articles.map((article) => (
        <li key={article.id} style={{ borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)", paddingBottom: 16 }}>
          <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
            <Text as="h3" textStyle="t5Bold" color="fg.neutral">{article.title}</Text>
            {article.excerpt && (
              <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 6 }}>
                {article.excerpt}
              </Text>
            )}
          </a>
          {formatDate(article.publishedAt) && (
            <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 8 }}>
              {formatDate(article.publishedAt)}
            </Text>
          )}
        </li>
      ))}
    </ul>
  );
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const hub = await getPublicBlogHub(slug);
  if (!hub) return { robots: { index: false, follow: false } };

  const title = `${hub.displayName} 최신 글`;
  const socialTitle = `${title} | Magisa`;
  const description = `${hub.displayName}(${hub.host})의 최신 기술 글을 Magisa에서 모아 봅니다.`;
  const canonical = blogUrl(hub.slug);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: socialTitle, description, url: canonical, type: "website", locale: "ko_KR" },
    twitter: { card: "summary", title: socialTitle, description },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  await connection();
  const { slug } = await params;
  const hub = await getPublicBlogHub(slug);
  if (!hub) notFound();

  const canonical = blogUrl(hub.slug);
  const description = `${hub.displayName}(${hub.host})의 최신 기술 글을 Magisa에서 모아 봅니다.`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${hub.displayName} 최신 글 | Magisa`,
      description,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: "Magisa", url: SITE_URL },
      mainEntity: { "@type": "Organization", name: hub.displayName, url: hub.source.site_url },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Magisa", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "블로그", item: `${SITE_URL}/blogs` },
        { "@type": "ListItem", position: 3, name: hub.displayName, item: canonical },
      ],
    },
  ];

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PageHeader navHref="/" navLabel="전체 글" />

      <nav aria-label="breadcrumb">
        <ol style={{ display: "flex", gap: 8, listStyle: "none", flexWrap: "wrap" }}>
          <li><Link href="/">Magisa</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/blogs">블로그</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{hub.displayName}</li>
        </ol>
      </nav>

      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">{hub.displayName} 최신 글</Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
          {hub.host}에서 발행한 기술 글을 Magisa가 수집해 최신순으로 보여드립니다.
        </Text>
        <a href={hub.source.site_url} target="_blank" rel="noopener noreferrer">
          <Text as="span" textStyle="t3Medium" color="var(--seed-color-fg-brand)">원문 블로그 방문하기 →</Text>
        </a>
      </header>

      <section aria-labelledby="latest-articles">
        <Text as="h2" id="latest-articles" textStyle="t6Bold" color="fg.neutral" style={{ marginBottom: 16 }}>
          최신 글
        </Text>
        <ArticleList articles={hub.articles} />
      </section>

      {hub.categories.length > 0 && (
        <section aria-labelledby="related-topics">
          <Text as="h2" id="related-topics" textStyle="t6Bold" color="fg.neutral" style={{ marginBottom: 12 }}>
            이 블로그의 주제
          </Text>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {hub.categories.map((category) => (
              <Link
                key={category}
                href={`/topics/${category}`}
                style={{ border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 999, padding: "7px 12px" }}
              >
                {PUBLIC_CATEGORY_META[category].label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
