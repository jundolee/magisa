import type { Metadata } from "next";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { DigestArchiveList } from "@/components/weekly-digest/digest-archive-list";
import { DigestBreadcrumbs } from "@/components/weekly-digest/digest-breadcrumbs";
import { DigestHeader } from "@/components/weekly-digest/digest-header";
import { listRecentDigestWeeks } from "@/lib/data/weekly-digests";

const SITE_URL = "https://magisa.vercel.app";
const TITLE = "주간 테크 큐레이션 아카이브";
const DESCRIPTION = "매주 Magisa가 모은 테크 블로그 새 글을 주차별로 다시 찾아볼 수 있는 아카이브입니다.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/digest" },
  openGraph: {
    title: `${TITLE} | Magisa`,
    description: DESCRIPTION,
    url: `${SITE_URL}/digest`,
    locale: "ko_KR",
    type: "website",
  },
};

export default async function DigestArchivePage() {
  // 이 페이지는 Supabase 환경 변수가 있는 배포 요청에서만 데이터를 읽는다.
  // `connection()`은 빌드 시점 프리렌더를 멈추되, 하위 fetch의 15분 Data Cache는 유지한다.
  await connection();
  const weeks = await listRecentDigestWeeks();

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <DigestHeader />
      <DigestBreadcrumbs />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          {TITLE}
        </Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
          한 주 동안 새로 발행된 테크 블로그 글의 흐름을 빠르게 훑고, 관심 가는 글은 원문에서 이어 읽어보세요.
        </Text>
      </div>
      <section aria-labelledby="weekly-archives" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Text as="h2" id="weekly-archives" textStyle="t6Bold" color="fg.neutral">
          최근 주간 아카이브
        </Text>
        <DigestArchiveList items={weeks} />
      </section>
    </main>
  );
}
