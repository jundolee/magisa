import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { RelatedArticleList } from "@/components/related-article-list";
import { markArticleRead } from "@/lib/data/articles";
import { ArticleSummaryCopy } from "@/components/article-summary-copy";
import { getArticlePreview, getRelatedArticles } from "@/lib/data/related-articles";
import { getCurrentUser } from "@/lib/supabase/current-user";
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
  const [article, initialRelated, user] = await Promise.all([articlePromise, relatedPromise, getCurrentUser()]);
  if (!article) notFound();

  if (user) {
    try {
      // A hard reload can cancel the client-side click action; mark the opened page read here too.
      await markArticleRead(user.id, article.id);
    } catch (error) {
      console.error("Failed to persist article read state during page render:", error);
    }
  }

  const related = initialRelated.length > 0
    ? initialRelated
    : await getRelatedArticles(article.id, article.category, article.tags);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 0 56px" }}>
      <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>← {SITE_NAME} 목록으로</Link>
      <Text as="p" textStyle="t2Medium" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 28 }}>
        {article.sourceTitle ?? "출처 미상"}{article.publishedAt ? ` · ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(article.publishedAt))}` : ""}
      </Text>
      <Text as="h1" textStyle="t8Bold" color="fg.neutral" style={{ marginTop: 12, lineHeight: 1.25 }}>{article.title}</Text>
      <section aria-labelledby="ai-summary-heading" style={{ marginTop: 28, border: `1px solid ${article.summary ? "#fbd8bc" : "var(--seed-color-stroke-neutral-subtle)"}`, borderRadius: 20, padding: "24px 28px", background: article.summary ? "linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)" : undefined }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span aria-hidden="true" style={{ fontSize: 16 }}>✨</span>
            <Text as="h2" id="ai-summary-heading" textStyle="t5Bold" color="fg.neutral">AI 엔지니어링 브리핑</Text>
          </div>
          {article.summary && (
            <Text as="span" textStyle="t1Regular" color="var(--seed-color-fg-neutral-muted)">{summaryBasisNotice(article.summaryBasis)}</Text>
          )}
        </div>
        {article.summary ? <>
          <div style={{ borderLeft: "3px solid var(--seed-color-bg-brand-solid, #eb641c)", paddingLeft: 14, marginBottom: 18 }}>
            <ArticleSummaryCopy text={article.summary.lead} className="article-summary-lead" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {article.summary.keyPoints.map((point, index) => {
              const meta = ENGINEERING_BOX_METAS[index] ?? { icon: "📌", label: `핵심 ${index + 1}`, bg: "#ffffff", border: "#fed7aa", tagColor: "var(--seed-color-fg-brand)" };
              return (
                <div key={`${index}-${point}`} style={{ background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 14, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span aria-hidden="true" style={{ fontSize: 14 }}>{meta.icon}</span>
                    <Text as="span" textStyle="t2Bold" style={{ color: meta.tagColor }}>{meta.label}</Text>
                  </div>
              <ArticleSummaryCopy text={point} className="article-summary-point" />
                </div>
              );
            })}
          </div>
        </> : <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 6 }}>
          {article.summaryStatus === "pending" ? "원문 본문을 가져와 요약할 예정입니다. 다음 요약 작업을 기다리고 있습니다." :
            article.summaryStatus === "processing" ? "원문을 확인하고 요약을 만들고 있습니다." :
              article.summaryStatus === "failed" ? "원문을 가져오거나 요약을 만드는 데 실패했습니다. 잠시 후 다시 시도합니다." :
              article.summaryStatus === "unavailable" ? "원문 본문을 추출할 수 없어 요약을 제공하지 않습니다. 원문에서 확인해 주세요." :
                  "등록된 AI 요약이 없습니다. 원문에서 확인해 주세요."}
        </Text>}
      </section>
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "center", marginTop: 18, padding: 16, borderRadius: 14, background: "var(--seed-color-bg-brand-solid, #eb641c)", color: "white", textDecoration: "none", fontWeight: 700 }}>원문 읽기 ↗</a>
      <div style={{ marginTop: 28 }}>
        <RelatedArticleList items={related.map((item) => ({ ...item, href: `/articles/${encodeURIComponent(item.id)}` }))} />
      </div>
    </main>
  );
}
