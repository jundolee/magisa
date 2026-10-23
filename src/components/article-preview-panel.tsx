"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Text } from "@seed-design/react";
import { RelatedArticleList } from "@/components/related-article-list";
import { ShareButton } from "@/components/share-button";
import { getArticlePreviewAction, markArticleReadAction } from "@/app/articles/actions";
import { CATEGORY_MAP, type CategoryId } from "@/lib/categories";
import { cleanKeyPoint } from "@/lib/summary-utils";
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

const CLOSE_ANIMATION_DURATION_MS = 220;

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

export function ArticlePreviewPanel({
  article: initialArticle,
  related: initialRelated,
}: {
  article: ArticlePreview;
  related: RelatedArticle[];
}) {
  const router = useRouter();
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const backdropMouseDownTargetRef = useRef<EventTarget | null>(null);

  const [overrideArticle, setOverrideArticle] = useState<ArticlePreview | null>(null);
  const [overrideRelated, setOverrideRelated] = useState<RelatedArticle[] | null>(null);
  const [prevInitialId, setPrevInitialId] = useState(initialArticle.id);

  if (initialArticle.id !== prevInitialId) {
    setPrevInitialId(initialArticle.id);
    setOverrideArticle(null);
    setOverrideRelated(null);
  }

  const currentArticle = overrideArticle ?? initialArticle;
  const currentRelated = overrideRelated ?? initialRelated;
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  const [shouldAnimateEnter] = useState(() => {
    if (typeof window === "undefined") return false;
    const wasActive = !!(window as unknown as { __modalActive?: boolean }).__modalActive;
    (window as unknown as { __modalActive?: boolean }).__modalActive = true;
    return !wasActive;
  });

  const isClosingRef = useRef(false);

  const dragStartYRef = useRef<number | null>(null);
  const currentDragYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const beginCloseAnimation = useCallback(() => {
    if (isClosingRef.current) return false;
    isClosingRef.current = true;
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 640;
    if (dialogRef.current) {
      dialogRef.current.style.animation = "none";
      dialogRef.current.style.transition = `transform ${CLOSE_ANIMATION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease`;
      dialogRef.current.style.transform = isMobile ? "translateY(100%)" : "scale(0.96) translateY(12px)";
      if (!isMobile) {
        dialogRef.current.style.opacity = "0";
      }
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = "opacity 0.2s ease";
      backdropRef.current.style.opacity = "0";
    }
    return true;
  }, []);

  const handleClose = useCallback(() => {
    if (!beginCloseAnimation()) return;
    window.setTimeout(() => {
      (window as unknown as { __modalActive?: boolean }).__modalActive = false;
      // A browser Back action may have already left the article route while the
      // close animation was running. Do not consume another history entry.
      if (/^\/articles\/[0-9a-f-]+$/i.test(window.location.pathname)) {
        router.back();
      }
    }, CLOSE_ANIMATION_DURATION_MS);
  }, [beginCloseAnimation, router]);

  const handleSelectRelated = useCallback(
    async (articleId: string) => {
      if (articleId === currentArticle.id || isLoadingRelated) return;
      setIsLoadingRelated(true);
      window.history.pushState({ articleId }, "", `/articles/${encodeURIComponent(articleId)}`);
      bodyRef.current?.scrollTo({ top: 0, behavior: "instant" });
      void markArticleReadAction(articleId);

      try {
        const data = await getArticlePreviewAction(articleId);
        if (data) {
          setOverrideArticle(data.article);
          setOverrideRelated(data.related);
        }
      } catch (err) {
        console.error("Failed to load related article preview:", err);
      } finally {
        setIsLoadingRelated(false);
      }
    },
    [currentArticle.id, isLoadingRelated]
  );

  useEffect(() => {
    async function onPopState() {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/articles\/([0-9a-f-]+)$/i);
      if (!match) {
        beginCloseAnimation();
        return;
      }
      const targetId = match[1];
      if (targetId && targetId !== currentArticle.id) {
        setIsLoadingRelated(true);
        bodyRef.current?.scrollTo({ top: 0, behavior: "instant" });
        try {
          const data = await getArticlePreviewAction(targetId);
          if (data) {
            setOverrideArticle(data.article);
            setOverrideRelated(data.related);
          }
        } catch {
          // fallback
        } finally {
          setIsLoadingRelated(false);
        }
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [beginCloseAnimation, currentArticle.id]);

  // 관련 기사 클릭 등으로 article.id가 변경될 때 내부 스크롤을 맨 위로 초기화
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [currentArticle.id]);

  useEffect(() => {
    (window as unknown as { __modalActive?: boolean }).__modalActive = true;
    return () => {
      (window as unknown as { __modalActive?: boolean }).__modalActive = false;
    };
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    dragStartYRef.current = e.touches[0].clientY;
    currentDragYRef.current = 0;
    isDraggingRef.current = true;
    if (dialogRef.current) {
      dialogRef.current.style.transition = "none";
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDraggingRef.current || dragStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartYRef.current;
    if (deltaY > 0) {
      currentDragYRef.current = deltaY;
      if (dialogRef.current) {
        dialogRef.current.style.transform = `translateY(${deltaY}px)`;
      }
      if (backdropRef.current) {
        const opacity = Math.max(0.2, 1 - deltaY / 400);
        backdropRef.current.style.opacity = String(opacity);
      }
    } else {
      currentDragYRef.current = 0;
      if (dialogRef.current) {
        dialogRef.current.style.transform = "translateY(0)";
      }
    }
  }

  function handleTouchEnd() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const deltaY = currentDragYRef.current;
    if (deltaY > 70) {
      handleClose();
    } else {
      if (dialogRef.current) {
        dialogRef.current.style.transition = "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
        dialogRef.current.style.transform = "translateY(0)";
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = "opacity 0.25s ease";
        backdropRef.current.style.opacity = "1";
      }
    }
    dragStartYRef.current = null;
    currentDragYRef.current = 0;
  }

  function handleTouchCancel() {
    isDraggingRef.current = false;
    dragStartYRef.current = null;
    currentDragYRef.current = 0;
    if (dialogRef.current) {
      dialogRef.current.style.transition = "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
      dialogRef.current.style.transform = "translateY(0)";
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = "opacity 0.25s ease";
      backdropRef.current.style.opacity = "1";
    }
  }

  const bodyTouchStartYRef = useRef<number | null>(null);
  const isPullingDownFromTopRef = useRef<boolean>(false);

  function handleBodyTouchStart(e: React.TouchEvent) {
    if (bodyRef.current && bodyRef.current.scrollTop <= 0) {
      bodyTouchStartYRef.current = e.touches[0].clientY;
      isPullingDownFromTopRef.current = false;
    } else {
      bodyTouchStartYRef.current = null;
      isPullingDownFromTopRef.current = false;
    }
  }

  function handleBodyTouchMove(e: React.TouchEvent) {
    if (bodyTouchStartYRef.current === null || !bodyRef.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - bodyTouchStartYRef.current;

    // 본문 스크롤이 최상단인 상태에서 아래로 당길 때만 바텀시트 닫기 제스처로 전환
    if (bodyRef.current.scrollTop <= 0 && deltaY > 10) {
      isPullingDownFromTopRef.current = true;
      const dragY = deltaY - 10;
      currentDragYRef.current = dragY;
      if (dialogRef.current) {
        dialogRef.current.style.transition = "none";
        dialogRef.current.style.transform = `translateY(${dragY}px)`;
      }
      if (backdropRef.current) {
        const opacity = Math.max(0.2, 1 - dragY / 400);
        backdropRef.current.style.opacity = String(opacity);
      }
    }
  }

  function handleBodyTouchEnd() {
    if (isPullingDownFromTopRef.current) {
      isPullingDownFromTopRef.current = false;
      const deltaY = currentDragYRef.current;
      if (deltaY > 75) {
        handleClose();
      } else {
        if (dialogRef.current) {
          dialogRef.current.style.transition = "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
          dialogRef.current.style.transform = "translateY(0)";
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = "opacity 0.25s ease";
          backdropRef.current.style.opacity = "1";
        }
      }
    }
    bodyTouchStartYRef.current = null;
    currentDragYRef.current = 0;
  }

  function handleBodyTouchCancel() {
    bodyTouchStartYRef.current = null;
    isPullingDownFromTopRef.current = false;
    currentDragYRef.current = 0;
    if (dialogRef.current) {
      dialogRef.current.style.transition = "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
      dialogRef.current.style.transform = "translateY(0)";
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = "opacity 0.25s ease";
      backdropRef.current.style.opacity = "1";
    }
  }

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
        handleClose();
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
  }, [handleClose]);

  const date = formatDate(currentArticle.publishedAt);
  const categoryMeta = currentArticle.category && currentArticle.category !== "general" ? CATEGORY_MAP.get(currentArticle.category as CategoryId) : null;

  return (
    <div
      ref={backdropRef}
      role="presentation"
      className={`article-preview-backdrop ${shouldAnimateEnter ? "article-preview-backdrop-enter" : ""}`}
      onMouseDown={(event) => {
        backdropMouseDownTargetRef.current = event.target;
      }}
      onTouchStart={(event) => {
        backdropMouseDownTargetRef.current = event.target;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && backdropMouseDownTargetRef.current === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-preview-title"
        tabIndex={-1}
        className={`article-preview-dialog ${shouldAnimateEnter ? "article-preview-dialog-enter" : ""}`}
      >
        {/* 모바일 바텀시트 상단 드래그 핸들 */}
        <div
          className="article-preview-drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <span className="article-preview-drag-bar" />
        </div>

        {/* 상단 고정 액션 바: 긴 본문을 스크롤해도 닫기/공유 버튼이 항상 보임 */}
        <header
          className="article-preview-header"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <button
            type="button"
            className="article-preview-back-btn"
            onClick={handleClose}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            ← 목록으로
          </button>
          <div
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <ShareButton
              title={currentArticle.title}
              url={`/articles/${encodeURIComponent(currentArticle.id)}`}
              size="small"
              variant="neutralWeak"
            />
            <button
              type="button"
              aria-label="닫기"
              className="article-preview-close-btn"
              onClick={handleClose}
            >
              ×
            </button>
          </div>
        </header>

        {/* 본문 컨텐츠 (단일 독립 스크롤 영역) */}
        <div
          ref={bodyRef}
          className="article-preview-body"
          onTouchStart={handleBodyTouchStart}
          onTouchMove={handleBodyTouchMove}
          onTouchEnd={handleBodyTouchEnd}
          onTouchCancel={handleBodyTouchCancel}
        >
          {isLoadingRelated ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div
                  style={{
                    width: 140,
                    height: 24,
                    borderRadius: 12,
                    background: "var(--seed-color-bg-neutral-weak)",
                    marginBottom: 12,
                    animation: "skeleton-pulse 1.4s ease-in-out infinite",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div
                    style={{
                      width: "92%",
                      height: 28,
                      borderRadius: 8,
                      background: "var(--seed-color-bg-neutral-weak)",
                      animation: "skeleton-pulse 1.4s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      width: "60%",
                      height: 28,
                      borderRadius: 8,
                      background: "var(--seed-color-bg-neutral-weak)",
                      animation: "skeleton-pulse 1.4s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>

              <div
                className="ai-summary-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 160,
                    height: 22,
                    borderRadius: 6,
                    background: "#fed7aa",
                    animation: "skeleton-pulse 1.4s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    width: "100%",
                    height: 60,
                    borderRadius: 12,
                    background: "#ffedd5",
                    animation: "skeleton-pulse 1.4s ease-in-out infinite",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ height: 76, borderRadius: 14, background: "#fff8f8", border: "1px solid #fed7d7", animation: "skeleton-pulse 1.4s ease-in-out infinite" }} />
                  <div style={{ height: 76, borderRadius: 14, background: "#f0f9ff", border: "1px solid #bae6fd", animation: "skeleton-pulse 1.4s ease-in-out infinite" }} />
                  <div style={{ height: 76, borderRadius: 14, background: "#fefce8", border: "1px solid #fef08a", animation: "skeleton-pulse 1.4s ease-in-out infinite" }} />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 1. 메타 정보 (출처, 날짜, 카테고리) & 제목 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <Badge size="medium" variant="weak" tone="neutral">
                    {currentArticle.sourceTitle ?? "출처 미상"}
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

                <h1 id="article-preview-title" className="article-preview-title">
                  {currentArticle.title}
                </h1>
              </div>

              {/* 2. [최상위 계층] ✨ AI 요약 (엔지니어링 3-Box 브리핑 or 주제/발췌 일반 텍스트 요약) */}
              {currentArticle.summary ? (
                currentArticle.summaryBasis !== "excerpt" && currentArticle.summary.keyPoints.length >= 3 ? (
                  <section aria-labelledby="ai-summary-heading" className="ai-summary-card">
                    <div className="ai-summary-header">
                      <div className="ai-summary-title-wrap">
                        <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>✨</span>
                        <h2 id="ai-summary-heading" className="ai-summary-title">
                          AI 엔지니어링 브리핑
                        </h2>
                      </div>
                      <span className="ai-summary-basis-badge">
                        {summaryBasisNotice(currentArticle.summaryBasis)}
                      </span>
                    </div>

                    {/* 리드 결론문 */}
                    <div className="ai-summary-lead-box">
                      <p className="ai-summary-lead-text">
                        {currentArticle.summary.lead}
                      </p>
                    </div>

                    {/* 엔지니어링 3-Box (문제 ➔ 기술/해결책 ➔ 교훈/주의점) */}
                    <div className="ai-summary-point-list">
                      {currentArticle.summary.keyPoints.map((point, index) => {
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
                  /* 주제/발췌 기반 요약 등은 복잡한 3-Box 대신 깔끔하고 읽기 편한 텍스트로 처리 */
                  <section aria-labelledby="ai-summary-heading" className="ai-summary-card">
                    <div className="ai-summary-header">
                      <div className="ai-summary-title-wrap">
                        <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>✨</span>
                        <h2 id="ai-summary-heading" className="ai-summary-title">
                          AI 요약
                        </h2>
                      </div>
                      <span className="ai-summary-basis-badge">
                        {summaryBasisNotice(currentArticle.summaryBasis)}
                      </span>
                    </div>

                    <div className="ai-summary-lead-box">
                      <p className="ai-summary-lead-text">
                        {currentArticle.summary.lead}
                      </p>
                    </div>

                    {currentArticle.summary.keyPoints.length > 0 && (
                      <ul className="ai-summary-text-list">
                        {currentArticle.summary.keyPoints.map((point, index) => (
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
                <section aria-labelledby="ai-summary-heading" className="ai-summary-fallback-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span aria-hidden="true" style={{ fontSize: 16 }}>🤖</span>
                    <h2 id="ai-summary-heading" className="ai-summary-title" style={{ fontSize: 16 }}>
                      AI 요약
                    </h2>
                  </div>
                  <p className="ai-summary-fallback-text">
                    {summaryNotice(currentArticle.summaryStatus)}
                  </p>
                </section>
              )}

              {/* 3. [데스크톱 인라인 액션] 원문 읽기 CTA 버튼 */}
              <div className="article-preview-inline-cta">
                <a
                  href={currentArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="article-preview-cta-btn"
                >
                  <span>{currentArticle.sourceTitle ? `${currentArticle.sourceTitle}에서 전체 원문 읽기` : "전체 원문 읽기"}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>

              {/* 4. [지식 확장] AI 벡터 시맨틱 연관 기사 리스트 */}
              <div style={{ borderTop: "1px solid var(--seed-color-stroke-neutral-subtle)", paddingTop: 16 }}>
                <RelatedArticleList
                  items={currentRelated.map((item) => ({ ...item, href: `/articles/${encodeURIComponent(item.id)}` }))}
                  onSelectArticle={handleSelectRelated}
                />
              </div>

              <Text as="p" textStyle="t1Regular" color="var(--seed-color-fg-neutral-muted)" style={{ textAlign: "center", marginTop: 4 }}>
                원문과 발행처를 확인한 뒤 읽어 주세요.
              </Text>
            </>
          )}
        </div>

        {/* 모바일 하단 고정 CTA 바: 언제든 손쉽게 전체 원문으로 이동 */}
        <div className="article-preview-bottom-bar">
          <a
            href={currentArticle.url}
            target="_blank"
            rel="noopener noreferrer"
            className="article-preview-cta-btn"
          >
            <span>{currentArticle.sourceTitle ? `${currentArticle.sourceTitle}에서 전체 원문 읽기` : "전체 원문 읽기"}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </div>
  );
}
