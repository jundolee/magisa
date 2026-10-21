import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { RelatedArticleList } from "@/components/related-article-list";
import { getArticlePreview, getRelatedArticles } from "@/lib/data/related-articles";
import { SITE_NAME } from "@/app/seo";

export const runtime = "nodejs";

type ArticlePageProps = { params: Promise<{ id: string }> };

async function getArticle(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return getArticlePreview(id);
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) return { robots: { index: false, follow: false } };
  return {
    title: article.title,
    description: article.excerpt?.slice(0, 160) ?? `원문 발행처에서 확인할 수 있는 글입니다. ${SITE_NAME}`,
    alternates: { canonical: `/articles/${encodeURIComponent(article.id)}` },
    robots: { index: false, follow: true },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  await connection();
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();
  const related = await getRelatedArticles(article.id, article.category, article.tags);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 0 56px" }}>
      <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>← {SITE_NAME} 목록으로</Link>
      <Text as="p" textStyle="t2Medium" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 28 }}>
        {article.sourceTitle ?? "출처 미상"}{article.publishedAt ? ` · ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(article.publishedAt))}` : ""}
      </Text>
      <Text as="h1" textStyle="t8Bold" color="fg.neutral" style={{ marginTop: 12, lineHeight: 1.25 }}>{article.title}</Text>
      <section aria-labelledby="ai-summary-heading" style={{ marginTop: 28, border: `1px solid ${article.summary ? "#f5c9ad" : "var(--seed-color-stroke-neutral-subtle)"}`, borderRadius: 18, padding: 22, background: article.summary ? "#fff8f3" : undefined }}>
        <Text as="h2" id="ai-summary-heading" textStyle="t5Bold" color="fg.neutral">AI 요약</Text>
        {article.summary ? <>
          <Text as="p" textStyle="t3Medium" color="fg.neutral" style={{ marginTop: 12 }}>{article.summary.lead}</Text>
          <ol style={{ paddingLeft: 22, margin: "14px 0 0", display: "grid", gap: 10 }}>
            {article.summary.keyPoints.map((point, index) => <li key={`${index}-${point}`}><Text as="span" textStyle="t3Regular" color="fg.neutral">{point}</Text></li>)}
          </ol>
          <Text as="p" textStyle="t1Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 14 }}>기존 수집 제목과 발췌를 바탕으로 만든 짧은 요약입니다.</Text>
        </> : <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 6 }}>
          {article.summaryStatus === "pending" ? "요약 대기 중입니다. 원문과 수집 발췌를 이용할 수 있습니다." :
            article.summaryStatus === "processing" ? "요약을 만들고 있습니다. 잠시 후 다시 확인해 주세요." :
              article.summaryStatus === "failed" ? "요약 생성에 실패했습니다. 원문과 수집 발췌를 이용해 주세요." :
              article.summaryStatus === "unavailable" ? "저장된 발췌가 짧거나 요약 입력으로 부족해 AI 요약을 제공하지 않습니다." :
                  "요약이 아직 준비되지 않았습니다. 기존 수집 발췌와 원문을 확인해 주세요."}
        </Text>}
      </section>
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "center", marginTop: 18, padding: 16, borderRadius: 14, background: "var(--seed-color-bg-brand-solid, #eb641c)", color: "white", textDecoration: "none", fontWeight: 700 }}>원문 읽기 ↗</a>
      <Link href={`/articles/${encodeURIComponent(article.id)}/connections`} style={{ display: "block", marginTop: 14, color: "var(--seed-color-fg-brand)", fontWeight: 600 }}>
        비슷한 기사와 내 노트 연결하기 →
      </Link>
      <section aria-labelledby="excerpt-heading" style={{ marginTop: 22 }}>
        <Text as="h2" id="excerpt-heading" textStyle="t4Bold" color="fg.neutral">수집 발췌</Text>
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{article.excerpt || "등록된 발췌가 없습니다. 원문에서 내용을 확인해 주세요."}</Text>
      </section>
      <RelatedArticleList items={related.map((item) => ({ ...item, href: `/articles/${encodeURIComponent(item.id)}` }))} />
    </main>
  );
}
