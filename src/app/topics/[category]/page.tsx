import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import {
  PUBLIC_CATEGORY_IDS,
  PUBLIC_CATEGORY_META,
  SITE_URL,
  getPublicCategoryHub,
  isPublicCategory,
  type PublicHubArticle,
} from "@/lib/data/public-hubs";

// 공개 허브는 Supabase 읽기 모듈을 함께 번들링하므로 기본 Node.js 런타임을 사용한다.
export const runtime = "nodejs";
// params로 동적 렌더링돼도 공개 데이터의 fetch 캐시는 유지한다.
export const fetchCache = "default-cache";

type TopicPageProps = { params: Promise<{ category: string }> };

function topicUrl(category: string): string {
  return `${SITE_URL}/topics/${encodeURIComponent(category)}`;
}

function formatDate(iso: string | null): string | null {
  return iso ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso)) : null;
}

function ArticleList({ articles }: { articles: PublicHubArticle[] }) {
  if (articles.length === 0) {
    return (
      <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
        아직 이 주제로 수집된 글이 없습니다. 다른 주제의 최신 글을 살펴보세요.
      </Text>
    );
  }

  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 16 }}>
      {articles.map((article) => (
        <li
          key={article.id}
          style={{ borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)", paddingBottom: 16 }}
        >
          <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
            <Text as="h3" textStyle="t5Bold" color="fg.neutral">
              {article.title}
            </Text>
            {article.excerpt && (
              <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 6 }}>
                {article.excerpt}
              </Text>
            )}
          </a>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            {article.source && (
              <Link href={`/blogs/${encodeURIComponent(article.source.slug)}`}>
                <Text as="span" textStyle="t2Medium" color="var(--seed-color-fg-brand)">
                  {article.source.title}
                </Text>
              </Link>
            )}
            {formatDate(article.publishedAt) && (
              <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
                {formatDate(article.publishedAt)}
              </Text>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  await connection();
  const { category } = await params;
  if (!isPublicCategory(category)) return { robots: { index: false, follow: false } };

  const hub = await getPublicCategoryHub(category);
  if (!hub) return { robots: { index: false, follow: false } };

  const title = hub.meta.title;
  const socialTitle = `${title} | Magisa`;
  const canonical = topicUrl(category);
  return {
    title,
    description: hub.meta.description,
    alternates: { canonical },
    openGraph: { title: socialTitle, description: hub.meta.description, url: canonical, type: "website", locale: "ko_KR" },
    twitter: { card: "summary", title: socialTitle, description: hub.meta.description },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  await connection();
  const { category } = await params;
  const hub = await getPublicCategoryHub(category);
  if (!hub) notFound();

  const canonical = topicUrl(hub.category);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${hub.meta.title} | Magisa`,
      description: hub.meta.description,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: "Magisa", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Magisa", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "주제", item: `${SITE_URL}/topics/${hub.category}` },
        { "@type": "ListItem", position: 3, name: hub.meta.label, item: canonical },
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
          <li><span>주제</span></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{hub.meta.label}</li>
        </ol>
      </nav>

      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">{hub.meta.title}</Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">{hub.meta.description}</Text>
      </header>

      <section aria-labelledby="latest-articles">
        <Text as="h2" id="latest-articles" textStyle="t6Bold" color="fg.neutral" style={{ marginBottom: 16 }}>
          최신 글
        </Text>
        <ArticleList articles={hub.articles} />
      </section>

      <section aria-labelledby="related-topics">
        <Text as="h2" id="related-topics" textStyle="t6Bold" color="fg.neutral" style={{ marginBottom: 12 }}>
          다른 주제 둘러보기
        </Text>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {PUBLIC_CATEGORY_IDS.filter((id) => id !== hub.category).map((id) => (
            <Link
              key={id}
              href={`/topics/${id}`}
              style={{ border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 999, padding: "7px 12px" }}
            >
              {PUBLIC_CATEGORY_META[id].label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
