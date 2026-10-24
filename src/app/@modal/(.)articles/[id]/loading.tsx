"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ArticleModalLoading() {
  const router = useRouter();
  const backdropMouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        router.back();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div
      role="presentation"
      className="article-preview-backdrop"
      onMouseDown={(e) => {
        backdropMouseDownTargetRef.current = e.target;
      }}
      onTouchStart={(e) => {
        backdropMouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownTargetRef.current === e.currentTarget) {
          router.back();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="기사 불러오는 중"
        tabIndex={-1}
        className="article-preview-dialog"
      >
        {/* 모바일 바텀시트 상단 드래그 핸들 스켈레톤 */}
        <div className="article-preview-drag-handle">
          <span className="article-preview-drag-bar" />
        </div>

        {/* 상단 네비게이션 헤더 */}
        <header className="article-preview-header">
          <button
            type="button"
            className="article-preview-back-btn"
            onClick={() => router.back()}
          >
            ← 목록으로
          </button>
          <button
            type="button"
            aria-label="닫기"
            className="article-preview-close-btn"
            onClick={() => router.back()}
          >
            ×
          </button>
        </header>

        {/* 컨텐츠 스켈레톤 (단일 독립 스크롤 영역) */}
        <div className="article-preview-body">
          {/* 메타 정보 & 제목 스켈레톤 */}
          <div>
            <div
              style={{
                width: 140,
                height: 24,
                borderRadius: 12,
                background: "var(--seed-color-bg-neutral-weak)",
                marginBottom: 10,
                animation: "skeleton-pulse 1.4s ease-in-out infinite",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  width: "92%",
                  height: 32,
                  borderRadius: 8,
                  background: "var(--seed-color-bg-neutral-weak)",
                  animation: "skeleton-pulse 1.4s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  width: "60%",
                  height: 32,
                  borderRadius: 8,
                  background: "var(--seed-color-bg-neutral-weak)",
                  animation: "skeleton-pulse 1.4s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* AI 3-Box 요약 카드 스켈레톤 */}
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
            {/* 리드 박스 스켈레톤 */}
            <div
              style={{
                width: "100%",
                height: 60,
                borderRadius: 12,
                background: "#ffedd5",
                animation: "skeleton-pulse 1.4s ease-in-out infinite",
              }}
            />
            {/* 3개의 박스 스켈레톤 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  height: 76,
                  borderRadius: 14,
                  background: "#fff8f8",
                  border: "1px solid #fed7d7",
                  animation: "skeleton-pulse 1.4s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  height: 76,
                  borderRadius: 14,
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  animation: "skeleton-pulse 1.4s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  height: 76,
                  borderRadius: 14,
                  background: "#fefce8",
                  border: "1px solid #fef08a",
                  animation: "skeleton-pulse 1.4s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* 원문 링크 버튼 스켈레톤 */}
          <div
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              background: "var(--seed-color-bg-neutral-weak)",
              animation: "skeleton-pulse 1.4s ease-in-out infinite",
            }}
          />
        </div>
      </section>
    </div>
  );
}
