import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { PUBLIC_CATEGORY_IDS, PUBLIC_CATEGORY_META, SITE_URL } from "@/lib/data/public-hubs";

const TITLE = "테크 주제별 최신 글";
const DESCRIPTION = "AI, 프론트엔드, 백엔드, DevOps, 데이터 등 주제별로 테크 블로그의 최신 글을 찾아보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/topics` },
  openGraph: { title: `${TITLE} | 매일 읽는 테크 기사`, description: DESCRIPTION, url: `${SITE_URL}/topics`, locale: "ko_KR", type: "website" },
};

export default function TopicsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/topics`,
    isPartOf: { "@type": "WebSite", name: "매일 읽는 테크 기사", url: SITE_URL },
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader navHref="/" navLabel="전체 글" />
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">테크 주제별 최신 글</Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">{DESCRIPTION}</Text>
      </header>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, listStyle: "none" }}>
        {PUBLIC_CATEGORY_IDS.map((category) => {
          const meta = PUBLIC_CATEGORY_META[category];
          return (
            <li key={category}>
              <Link
                href={`/topics/${category}`}
                style={{ display: "flex", minHeight: 132, flexDirection: "column", gap: 8, padding: 18, border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 12 }}
              >
                <Text as="h2" textStyle="t5Bold" color="fg.neutral">{meta.title}</Text>
                <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">{meta.description}</Text>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
