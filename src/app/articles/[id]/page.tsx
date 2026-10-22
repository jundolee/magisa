import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { RelatedArticleList } from "@/components/related-article-list";
import { getArticlePreview, getRelatedArticles } from "@/lib/data/related-articles";
import { cleanKeyPoint } from "@/lib/summary-utils";
import { SITE_NAME } from "@/app/seo";

export const runtime = "nodejs";

const ENGINEERING_BOX_METAS = [
  { icon: "🚨", label: "문제 & 배경", bg: "#fff8f8", border: "#fed7d7", tagColor: "#c53030" },
  { icon: "🛠️", label: "기술 & 해결책", bg: "#f0f9ff", border: "#bae6fd", tagColor: "#0284c7" },
  { icon: "💡", label: "교훈 & 주의점", bg: "#fefce8", border: "#fef08a", tagColor: "#b45309" },
];

function summaryBasisNotice(basis: "full_article" | "partial_article" | "excerpt" | null): string {
  if (basis === "excerpt") return "기존 글에 저장되어 있던 제목과 발췌를 바탕으로 만든 요약입니다.";
  if (basis === "partial_article") return "원문 페이지에서 추출한 일부 본문을 바탕으로 만든 요약입니다.";
  return "원문 페이지에서 추출한 본문을 바탕으로 만든 요약입니다.";
}

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

  const articlePromise = getArticle(id);
  const relatedPromise = getRelatedArticles(id);
  const [article, initialRelated] = await Promise.all([articlePromise, relatedPromise]);
  if (!article) notFound();

  const related = initialRelated.length > 0
    ? initialRelated
    : await getRelatedArticles(article.id, article.category, article.tags);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 0 56px" }}>
      <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>← {SITE_NAME} 목록으로</Link>
      <Text as="p" textStyle="t2Medium" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 28 }}>
        {article.sourceTitle ?? "출처 미상"}{article.publishedAt ? ` · ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(article.publishedAt))}` : ""}
      </Text>
      <h1 className="article-preview-title" style={{ marginTop: 12 }}>
        {article.title}
      </h1>

      {article.summary ? (
        article.summaryBasis !== "excerpt" && article.summary.keyPoints.length >= 3 ? (
          <section aria-labelledby="ai-summary-heading" className="ai-summary-card" style={{ marginTop: 28 }}>
            <div className="ai-summary-header">
              <div className="ai-summary-title-wrap">
                <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>✨</span>
                <h2 id="ai-summary-heading" className="ai-summary-title">
                  AI 엔지니어링 브리핑
                </h2>
              </div>
              <span className="ai-summary-basis-badge">
                {summaryBasisNotice(article.summaryBasis)}
              </span>
            </div>

            <div className="ai-summary-lead-box">
              <p className="ai-summary-lead-text">
                {article.summary.lead}
              </p>
            </div>

            <div className="ai-summary-point-list">
              {article.summary.keyPoints.map((point, index) => {
                const meta = ENGINEERING_BOX_METAS[index] ?? {
                  icon: "📌",
                  label: `핵심 ${index + 1}`,
                  bg: "#ffffff",
                  border: "#fed7aa",
                  tagColor: "var(--seed-color-fg-brand)",
                };
                return (
                  <div
                    key={`${index}-${point}`}
                    className="ai-summary-point-card"
                    style={{
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                    }}
                  >
                    <div className="ai-summary-point-header">
                      <span aria-hidden="true" className="ai-summary-point-icon">{meta.icon}</span>
                      <span className="ai-summary-point-label" style={{ color: meta.tagColor }}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="ai-summary-point-text">
                      {cleanKeyPoint(point)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section aria-labelledby="ai-summary-heading" className="ai-summary-card" style={{ marginTop: 28 }}>
            <div className="ai-summary-header">
              <div className="ai-summary-title-wrap">
                <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>✨</span>
                <h2 id="ai-summary-heading" className="ai-summary-title">
                  AI 요약
                </h2>
              </div>
              <span className="ai-summary-basis-badge">
                {summaryBasisNotice(article.summaryBasis)}
              </span>
            </div>

            <div className="ai-summary-lead-box">
              <p className="ai-summary-lead-text">
                {article.summary.lead}
              </p>
            </div>

            {article.summary.keyPoints.length > 0 && (
              <ul className="ai-summary-text-list">
                {article.summary.keyPoints.map((point, index) => (
                  <li key={`${index}-${point}`} className="ai-summary-text-item">
                    <span aria-hidden="true" className="ai-summary-text-bullet">•</span>
                    <p className="ai-summary-point-text">
                      {cleanKeyPoint(point)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      ) : (
        <section aria-labelledby="ai-summary-heading" className="ai-summary-fallback-card" style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span aria-hidden="true" style={{ fontSize: 16 }}>🤖</span>
            <h2 id="ai-summary-heading" className="ai-summary-title" style={{ fontSize: 16 }}>
              AI 요약
            </h2>
          </div>
          <p className="ai-summary-fallback-text">
            {article.summaryStatus === "pending"
              ? "원문 본문을 가져와 요약할 예정입니다. 다음 요약 작업을 기다리고 있습니다."
              : article.summaryStatus === "processing"
              ? "원문을 확인하고 요약을 만들고 있습니다."
              : article.summaryStatus === "failed"
              ? "원문을 가져오거나 요약을 만드는 데 실패했습니다. 잠시 후 다시 시도합니다."
              : article.summaryStatus === "unavailable"
              ? "원문 본문을 추출할 수 없어 요약을 제공하지 않습니다. 원문에서 확인해 주세요."
              : "등록된 AI 요약이 없습니다. 원문에서 확인해 주세요."}
          </p>
        </section>
      )}

      <div style={{ marginTop: 20 }}>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="article-preview-cta-btn"
        >
          <span>{article.sourceTitle ? `${article.sourceTitle}에서 전체 원문 읽기` : "전체 원문 읽기"}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
      <div style={{ marginTop: 28 }}>
        <RelatedArticleList items={related.map((item) => ({ ...item, href: `/articles/${encodeURIComponent(item.id)}` }))} />
      </div>
    </main>
  );
}
