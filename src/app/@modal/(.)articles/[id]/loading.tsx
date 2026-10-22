"use client";

import { useEffect } from "react";

export default function ArticleModalLoading() {
  useEffect(() => {
    (window as unknown as { __modalActive?: boolean }).__modalActive = true;
  }, []);

  return (
    <div
      role="presentation"
      className="article-preview-backdrop article-preview-backdrop-enter"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="기사 불러오는 중"
        tabIndex={-1}
        className="article-preview-dialog article-preview-dialog-enter"
      >
        {/* 모바일 바텀시트 상단 드래그 핸들 스켈레톤 */}
        <div className="article-preview-drag-handle">
          <span className="article-preview-drag-bar" />
        </div>

        {/* 상단 네비게이션 헤더 */}
        <header className="article-preview-header">
          <div
            style={{
              color: "var(--seed-color-fg-neutral-muted)",
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 10px",
              minHeight: 40,
            }}
          >
            ← 목록으로
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--seed-color-bg-neutral-weak)",
              color: "var(--seed-color-fg-neutral-muted)",
              fontSize: 22,
              display: "grid",
              placeItems: "center",
              lineHeight: 1,
            }}
          >
            ×
          </div>
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

          {/* AI 3-Box 요약 카드 스켈레톤 */}
          <div
            style={{
              borderRadius: 20,
              padding: "24px 20px",
              border: "1px solid var(--seed-color-stroke-neutral-subtle)",
              background: "var(--seed-color-bg-neutral-weak, #fafafa)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 160,
                height: 20,
                borderRadius: 6,
                background: "var(--seed-color-stroke-neutral-subtle)",
                animation: "skeleton-pulse 1.4s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: "100%",
                height: 20,
                borderRadius: 6,
                background: "var(--seed-color-stroke-neutral-subtle)",
                animation: "skeleton-pulse 1.4s ease-in-out infinite",
              }}
            />
            {/* 3개의 박스 스켈레톤 */}
            <div
              style={{
                height: 52,
                borderRadius: 14,
                background: "rgba(0,0,0,0.03)",
                animation: "skeleton-pulse 1.4s ease-in-out infinite",
              }}
            />
            <div
              style={{
                height: 52,
                borderRadius: 14,
                background: "rgba(0,0,0,0.03)",
                animation: "skeleton-pulse 1.4s ease-in-out infinite",
              }}
            />
            <div
              style={{
                height: 52,
                borderRadius: 14,
                background: "rgba(0,0,0,0.03)",
                animation: "skeleton-pulse 1.4s ease-in-out infinite",
              }}
            />
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
