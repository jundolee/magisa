import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { DigestArticleList } from "@/components/weekly-digest/digest-article-list";
import { DigestBreadcrumbs } from "@/components/weekly-digest/digest-breadcrumbs";
import { DigestDistributionList } from "@/components/weekly-digest/digest-distribution-list";
import { DigestHeader } from "@/components/weekly-digest/digest-header";
import { DigestJsonLd } from "@/components/weekly-digest/digest-json-ld";
import { getWeeklyDigest, isValidDigestWeek } from "@/lib/data/weekly-digests";

const SITE_URL = "https://magisa.vercel.app";

type PageProps = {
  params: Promise<{ week: string }>;
};

function getPageDescription(label: string, dateRangeLabel: string, articleCount: number): string {
  return `${dateRangeLabel}에 새로 발행된 테크 블로그 글 ${articleCount}개를 ${label} 큐레이션으로 정리했습니다.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { week } = await params;
  if (!isValidDigestWeek(week)) notFound();

  const digest = await getWeeklyDigest(week);
  if (!digest) notFound();

  const title = `${digest.label} 테크 큐레이션`;
  const description = getPageDescription(digest.label, digest.dateRangeLabel, digest.articleCount);

  return {
    title,
    description,
    alternates: { canonical: `/digest/${digest.week}` },
    openGraph: {
      title: `${title} | Magisa`,
      description,
      url: `${SITE_URL}/digest/${digest.week}`,
      locale: "ko_KR",
      type: "website",
    },
  };
}

export default async function WeeklyDigestPage({ params }: PageProps) {
  await connection();
  const { week } = await params;
  if (!isValidDigestWeek(week)) notFound();

  const digest = await getWeeklyDigest(week);
  if (!digest) notFound();

  const canonicalUrl = `${SITE_URL}/digest/${digest.week}`;
  const description = getPageDescription(digest.label, digest.dateRangeLabel, digest.articleCount);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <DigestJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "주간 큐레이션", item: `${SITE_URL}/digest` },
            { "@type": "ListItem", position: 3, name: digest.label, item: canonicalUrl },
          ],
        }}
      />
      <DigestJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${digest.label} 테크 큐레이션`,
          description,
          url: canonicalUrl,
          inLanguage: "ko-KR",
          isPartOf: { "@type": "WebSite", name: "Magisa", url: SITE_URL },
        }}
      />
      <DigestHeader />
      <DigestBreadcrumbs current={digest.label} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          {digest.dateRangeLabel}
        </Text>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          {digest.label} 테크 큐레이션
        </Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
          이번 주에는 {digest.articleCount}개의 새 글이 모였습니다. 분야와 발행처의 분포를 먼저 살펴본 뒤,
          관심 가는 주제는 원문 링크에서 이어 읽어보세요.
        </Text>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 28,
          padding: 20,
          borderRadius: 12,
          background: "var(--seed-color-bg-neutral-weak)",
        }}
      >
        <DigestDistributionList id="category-distribution" title="카테고리 분포" items={digest.categoryDistribution} />
        <DigestDistributionList id="source-distribution" title="소스 분포" items={digest.sourceDistribution} />
      </div>
      <DigestArticleList articles={digest.latestArticles} totalCount={digest.articleCount} />
    </main>
  );
}
