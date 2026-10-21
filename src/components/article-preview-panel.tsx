"use client";

import { useEffect, useRef } from "react";
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
  if (status === "pending") return "원문 본문을 가져와 요약할 예정입니다. 다음 요약 작업을 기다리고 있습니다.";
  if (status === "processing") return "원문을 확인하고 요약을 만들고 있습니다.";
  if (status === "failed") return "원문을 가져오거나 요약을 만드는 데 실패했습니다. 잠시 후 다시 시도합니다.";
  if (status === "unavailable") return "원문 본문을 추출할 수 없어 요약을 제공하지 않습니다. 원문에서 확인해 주세요.";
  return "등록된 AI 요약이 없습니다. 원문에서 확인해 주세요.";
}

function summaryBasisNotice(basis: ArticlePreview["summaryBasis"]): string {
  if (basis === "excerpt") return "기존 글에 저장되어 있던 제목과 발췌를 바탕으로 만든 요약입니다.";
  if (basis === "partial_article") return "원문 페이지에서 추출한 일부 본문을 바탕으로 만든 요약입니다.";
  return "원문 페이지에서 추출한 본문을 바탕으로 만든 요약입니다.";
}

export function ArticlePreviewPanel({ article, related }: { article: ArticlePreview; related: RelatedArticle[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button[aria-label='닫기']")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.back();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      if (!focusable?.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [router]);

  const date = formatDate(article.publishedAt);
  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) router.back(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 16, background: "rgba(25, 27, 30, .58)" }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-preview-title"
        tabIndex={-1}
        style={{ position: "relative", width: "min(760px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", borderRadius: 24, background: "var(--seed-color-bg-layer-default, #fff)", padding: "24px clamp(16px, 5vw, 48px) 36px", boxShadow: "0 24px 80px rgba(0,0,0,.24)" }}
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
              <Text as="p" textStyle="t1Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 14 }}>{summaryBasisNotice(article.summaryBasis)}</Text>
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

          <RelatedArticleList items={related.map((item) => ({ ...item, href: `/articles/${encodeURIComponent(item.id)}` }))} />
          <Text as="p" textStyle="t1Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 20 }}>
            원문과 발행처를 확인한 뒤 읽어 주세요.
          </Text>
        </div>
      </section>
    </div>
  );
}
