"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Text } from "@seed-design/react";
import { RelatedArticleList } from "@/components/related-article-list";
import type { ArticlePreview, RelatedArticle } from "@/lib/data/related-articles";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function summaryNotice(status: ArticlePreview["summaryStatus"]): string {
  if (status === "pending") return "요약 대기 중입니다. 원문 링크와 수집 발췌를 이용할 수 있습니다.";
  if (status === "processing") return "요약을 만들고 있습니다. 잠시 후 다시 확인해 주세요.";
  if (status === "failed") return "요약 생성에 실패했습니다. 원문 링크와 수집 발췌를 이용해 주세요.";
  if (status === "unavailable") return "저장된 발췌가 짧거나 요약 입력으로 부족해 AI 요약을 제공하지 않습니다.";
  return "요약이 아직 준비되지 않았습니다. 기존 수집 발췌와 원문을 확인해 주세요.";
}

export function ArticlePreviewPanel({ article, related }: { article: ArticlePreview; related: RelatedArticle[] }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") router.back();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const date = formatDate(article.publishedAt);
  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) router.back(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(25, 27, 30, .34)" }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-preview-title"
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "min(720px, 100%)", overflowY: "auto", background: "var(--seed-color-bg-layer-default, #fff)", padding: "28px clamp(22px, 5vw, 52px) 48px", boxShadow: "-12px 0 40px rgba(0,0,0,.12)" }}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)", paddingBottom: 18 }}>
          <button type="button" onClick={() => router.back()} style={{ border: 0, background: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>← 목록으로</button>
          <button type="button" aria-label="닫기" onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: "50%", border: 0, background: "var(--seed-color-bg-neutral-weak)", color: "inherit", cursor: "pointer", fontSize: 24 }}>×</button>
        </header>

        <div style={{ paddingTop: 30 }}>
          <Text as="p" textStyle="t2Medium" color="var(--seed-color-fg-neutral-muted)">
            {article.sourceTitle ?? "출처 미상"}{date ? ` · ${date}` : ""}{article.category !== "general" ? ` · ${article.category}` : ""}
          </Text>
          <Text as="h1" id="article-preview-title" textStyle="t8Bold" color="fg.neutral" style={{ marginTop: 18, lineHeight: 1.25 }}>
            {article.title}
          </Text>

          {article.summary ? (
            <section aria-labelledby="ai-summary-heading" style={{ marginTop: 28, border: "1px solid #f5c9ad", borderRadius: 18, padding: 22, background: "#fff8f3" }}>
              <Text as="h2" id="ai-summary-heading" textStyle="t5Bold" color="fg.neutral">AI 요약</Text>
              <Text as="p" textStyle="t3Medium" color="fg.neutral" style={{ marginTop: 12 }}>{article.summary.lead}</Text>
              <ol style={{ paddingLeft: 22, margin: "14px 0 0", display: "grid", gap: 10 }}>
                {article.summary.keyPoints.map((point, index) => <li key={`${index}-${point}`}><Text as="span" textStyle="t3Regular" color="fg.neutral">{point}</Text></li>)}
              </ol>
              <Text as="p" textStyle="t1Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 14 }}>기존 수집 제목과 발췌를 바탕으로 만든 짧은 요약입니다.</Text>
            </section>
          ) : (
            <section aria-labelledby="ai-summary-heading" style={{ marginTop: 28, border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 18, padding: 22, background: "var(--seed-color-bg-neutral-weak, #fafafa)" }}>
              <Text as="h2" id="ai-summary-heading" textStyle="t5Bold" color="fg.neutral">AI 요약</Text>
              <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 6 }}>
                {summaryNotice(article.summaryStatus)}
              </Text>
            </section>
          )}

          <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: 20, padding: "17px 20px", borderRadius: 14, background: "var(--seed-color-bg-brand-solid, #eb641c)", color: "white", textDecoration: "none", fontWeight: 700 }}>
            원문 읽기 ↗
          </a>
          <Link href={`/articles/${encodeURIComponent(article.id)}/connections`} style={{ display: "block", marginTop: 14, color: "var(--seed-color-fg-brand)", fontWeight: 600 }}>
            비슷한 기사와 내 노트 연결하기 →
          </Link>

          <section aria-labelledby="collected-excerpt-heading" style={{ marginTop: 22 }}>
            <Text as="h2" id="collected-excerpt-heading" textStyle="t4Bold" color="fg.neutral">수집 발췌</Text>
            <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
              {article.excerpt || "등록된 발췌가 없습니다. 원문에서 내용을 확인해 주세요."}
            </Text>
          </section>

          <RelatedArticleList items={related.map((item) => ({ ...item, href: `/articles/${encodeURIComponent(item.id)}` }))} />
          <Text as="p" textStyle="t1Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 20 }}>
            원문과 발행처를 확인한 뒤 읽어 주세요.
          </Text>
        </div>
      </section>
    </div>
  );
}

export function ArticlePreviewLink({ articleId }: { articleId: string }) {
  return <Link href={`/articles/${encodeURIComponent(articleId)}`} style={{ color: "var(--seed-color-fg-brand)", fontWeight: 600, textDecoration: "none" }}>간단히 보기</Link>;
}
