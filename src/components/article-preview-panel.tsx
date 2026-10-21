"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge, Text } from "@seed-design/react";
import { RelatedArticleList } from "@/components/related-article-list";
import { CATEGORY_MAP, type CategoryId } from "@/lib/categories";
import type { ArticlePreview, RelatedArticle } from "@/lib/data/related-articles";

const ENGINEERING_BOX_METAS = [
  {
    icon: "🚨",
    label: "문제 & 배경",
    bg: "#fff8f8",
    border: "#fed7d7",
    tagColor: "#c53030",
  },
  {
    icon: "🛠️",
    label: "기술 & 해결책",
    bg: "#f0f9ff",
    border: "#bae6fd",
    tagColor: "#0284c7",
  },
  {
    icon: "💡",
    label: "교훈 & 주의점",
    bg: "#fefce8",
    border: "#fef08a",
    tagColor: "#b45309",
  },
];

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
  if (basis === "excerpt") return "발췌 기반 요약";
  if (basis === "partial_article") return "일부 본문 기반 요약";
  return "원문 전문 기반 요약";
}

export function ArticlePreviewPanel({ article, related }: { article: ArticlePreview; related: RelatedArticle[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLElement>(null);
  const backdropMouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    // 1. 브라우저 스크롤 락 시 스크롤바 폭만큼 paddingRight를 보정하여 페이지가 좌우로 덜컹거리는 현상 방지
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

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
      document.body.style.paddingRight = previousPaddingRight;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [router]);

  const date = formatDate(article.publishedAt);
  const categoryMeta = article.category && article.category !== "general" ? CATEGORY_MAP.get(article.category as CategoryId) : null;

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        backdropMouseDownTargetRef.current = event.target;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && backdropMouseDownTargetRef.current === event.currentTarget) {
          router.back();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        overflowY: "auto",
        overscrollBehavior: "contain",
        padding: "32px 16px 48px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "rgba(25, 27, 30, .62)",
        scrollbarWidth: "thin",
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-preview-title"
        tabIndex={-1}
        style={{
          position: "relative",
          width: "min(740px, 100%)",
          borderRadius: 24,
          background: "var(--seed-color-bg-layer-default, #fff)",
          padding: "26px clamp(20px, 4.5vw, 44px) 40px",
          boxShadow: "0 24px 80px rgba(0,0,0,.26), 0 4px 16px rgba(0,0,0,.08)",
          margin: "auto 0",
        }}
      >
        {/* 상단 액션 바 */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)",
            paddingBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              border: 0,
              background: "none",
              color: "var(--seed-color-fg-neutral-muted)",
              cursor: "pointer",
              font: "inherit",
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 8px",
              borderRadius: 8,
            }}
          >
            ← 목록으로
          </button>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: 0,
              background: "var(--seed-color-bg-neutral-weak)",
              color: "inherit",
              cursor: "pointer",
              fontSize: 22,
              display: "grid",
              placeItems: "center",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>

        {/* 본문 컨텐츠 */}
        <div style={{ paddingTop: 26, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* 1. 메타 정보 (출처, 날짜, 카테고리) & 제목 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <Badge size="medium" variant="weak" tone="neutral">
                {article.sourceTitle ?? "출처 미상"}
              </Badge>
              {categoryMeta && (
                <Badge size="medium" variant="outline" tone={categoryMeta.badgeTone}>
                  {categoryMeta.label}
                </Badge>
              )}
              {date && (
                <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
                  {date}
                </Text>
              )}
            </div>

            <Text
              as="h1"
              id="article-preview-title"
              textStyle="t8Bold"
              color="fg.neutral"
              style={{ lineHeight: 1.35, wordBreak: "keep-all" }}
            >
              {article.title}
            </Text>
          </div>

          {/* 2. [최상위 계층] ✨ AI 엔지니어링 3-Box 브리핑 카드 */}
          {article.summary ? (
            <section
              aria-labelledby="ai-summary-heading"
              style={{
                borderRadius: 20,
                padding: "24px clamp(18px, 3.5vw, 28px)",
                background: "linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)",
                border: "1px solid #fbd8bc",
                boxShadow: "0 2px 10px rgba(235, 100, 28, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden="true" style={{ fontSize: 16 }}>✨</span>
                  <Text as="h2" id="ai-summary-heading" textStyle="t5Bold" color="fg.neutral">
                    AI 엔지니어링 브리핑
                  </Text>
                </div>
                <Text as="span" textStyle="t1Regular" color="var(--seed-color-fg-neutral-muted)">
                  {summaryBasisNotice(article.summaryBasis)}
                </Text>
              </div>

              {/* 리드 결론문 */}
              <div
                style={{
                  borderLeft: "3px solid var(--seed-color-bg-brand-solid, #eb641c)",
                  paddingLeft: 14,
                  marginBottom: 18,
                }}
              >
                <Text as="p" textStyle="t3Bold" color="fg.neutral" style={{ lineHeight: 1.5, wordBreak: "keep-all" }}>
                  {article.summary.lead}
                </Text>
              </div>

              {/* 엔지니어링 3-Box (문제 ➔ 기술/해결책 ➔ 교훈/주의점) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                      style={{
                        background: meta.bg,
                        border: `1px solid ${meta.border}`,
                        borderRadius: 14,
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span aria-hidden="true" style={{ fontSize: 14 }}>{meta.icon}</span>
                        <Text as="span" textStyle="t2Bold" style={{ color: meta.tagColor, letterSpacing: "-0.01em" }}>
                          {meta.label}
                        </Text>
                      </div>
                      <Text as="p" textStyle="t3Regular" color="fg.neutral" style={{ lineHeight: 1.55, margin: 0 }}>
                        {point}
                      </Text>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <section
              aria-labelledby="ai-summary-heading"
              style={{
                borderRadius: 18,
                padding: "20px 24px",
                background: "var(--seed-color-bg-neutral-weak, #fafafa)",
                border: "1px solid var(--seed-color-stroke-neutral-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span aria-hidden="true" style={{ fontSize: 16 }}>🤖</span>
                <Text as="h2" id="ai-summary-heading" textStyle="t5Bold" color="fg.neutral">
                  AI 요약
                </Text>
              </div>
              <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
                {summaryNotice(article.summaryStatus)}
              </Text>
            </section>
          )}

          {/* 3. [주요 액션] 원문 읽기 CTA 버튼 */}
          <div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                padding: "16px 24px",
                borderRadius: 16,
                background: "var(--seed-color-bg-brand-solid, #eb641c)",
                color: "white",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 16,
                boxShadow: "0 4px 16px rgba(235, 100, 28, 0.28)",
                transition: "opacity 0.15s ease",
              }}
            >
              <span>{article.sourceTitle ? `${article.sourceTitle}에서 전체 원문 읽기` : "전체 원문 읽기"}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          {/* 4. [지식 확장] AI 벡터 시맨틱 연관 기사 리스트 */}
          <div style={{ borderTop: "1px solid var(--seed-color-stroke-neutral-subtle)", paddingTop: 16 }}>
            <RelatedArticleList items={related.map((item) => ({ ...item, href: `/articles/${encodeURIComponent(item.id)}` }))} />
          </div>

          <Text as="p" textStyle="t1Regular" color="var(--seed-color-fg-neutral-muted)" style={{ textAlign: "center", marginTop: 4 }}>
            원문과 발행처를 확인한 뒤 읽어 주세요.
          </Text>
        </div>
      </section>
    </div>
  );
}
