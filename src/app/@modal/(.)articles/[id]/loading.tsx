export default function ArticleModalLoading() {
  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "rgba(25, 27, 30, .58)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="기사 불러오는 중"
        style={{
          position: "relative",
          width: "min(760px, 100%)",
          maxHeight: "calc(100dvh - 32px)",
          borderRadius: 24,
          background: "var(--seed-color-bg-layer-default, #fff)",
          padding: "24px clamp(16px, 5vw, 48px) 36px",
          boxShadow: "0 24px 80px rgba(0,0,0,.24)",
          overflowY: "hidden",
        }}
      >
        {/* 상단 네비게이션 헤더 */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)",
            paddingBottom: 16,
          }}
        >
          <span style={{ fontSize: 14, color: "var(--seed-color-fg-neutral-muted)" }}>← 목록으로</span>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--seed-color-bg-neutral-weak)",
              display: "grid",
              placeItems: "center",
              color: "var(--seed-color-fg-neutral-muted)",
              fontSize: 20,
            }}
          >
            ×
          </span>
        </header>

        {/* 컨텐츠 스켈레톤 */}
        <div style={{ paddingTop: 28, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 메타 정보 스켈레톤 */}
          <div
            style={{
              width: "180px",
              height: "16px",
              borderRadius: 6,
              background: "var(--seed-color-bg-neutral-weak)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />

          {/* 제목 스켈레톤 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                width: "90%",
                height: "28px",
                borderRadius: 8,
                background: "var(--seed-color-bg-neutral-weak)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: "60%",
                height: "28px",
                borderRadius: 8,
                background: "var(--seed-color-bg-neutral-weak)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* AI 요약 카드 스켈레톤 */}
          <div
            style={{
              borderRadius: 20,
              padding: 24,
              border: "1px solid var(--seed-color-stroke-neutral-subtle)",
              background: "var(--seed-color-bg-neutral-weak, #fafafa)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                width: "120px",
                height: "20px",
                borderRadius: 6,
                background: "var(--seed-color-stroke-neutral-subtle)",
              }}
            />
            <div
              style={{
                width: "100%",
                height: "16px",
                borderRadius: 6,
                background: "var(--seed-color-stroke-neutral-subtle)",
              }}
            />
            <div
              style={{
                width: "80%",
                height: "16px",
                borderRadius: 6,
                background: "var(--seed-color-stroke-neutral-subtle)",
              }}
            />
          </div>

          {/* 버튼 스켈레톤 */}
          <div
            style={{
              width: "100%",
              height: "52px",
              borderRadius: 14,
              background: "var(--seed-color-bg-neutral-weak)",
            }}
          />
        </div>
      </section>
    </div>
  );
}
