"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@seed-design/react";

export interface SourceOption {
  id: string;
  label: string;
  faviconUrl?: string | null;
}

const ALL_LABEL = "전체 블로그";

export function SourceFilterSelect({
  sources,
  current,
  onChange,
}: {
  sources: SourceOption[];
  current: string; // "all" 또는 source id
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const selectedSource = useMemo(
    () => sources.find((s) => s.id === current) ?? null,
    [sources, current],
  );

  const filteredSources = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) => s.label.toLowerCase().includes(q));
  }, [sources, search]);

  const handleOpen = () => {
    setSearch("");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSearch("");
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 모달이 열리면 검색창에 포커스
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isFiltered = current !== "all" && Boolean(selectedSource);

  return (
    <>
      {/* 카테고리 칩 바의 맨 앞에 들어가는 앵커 칩 버튼 */}
      <button
        type="button"
        className="source-filter-trigger"
        onClick={handleOpen}
        aria-label={isFiltered ? `선택된 블로그: ${selectedSource?.label}, 필터 변경` : "블로그 선택"}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "7px 10px",
          borderRadius: "8px",
          border: "1px solid var(--seed-color-stroke-neutral-subtle, #e5e5e5)",
          backgroundColor: "var(--seed-color-bg-layer-default, #fff)",
          color: "var(--seed-color-fg-neutral, #333)",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "all 0.15s ease",
          touchAction: "manipulation",
        }}
      >
        <span className="source-filter-trigger-label">{isFiltered ? selectedSource?.label : ALL_LABEL}</span>

        {isFiltered ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="블로그 필터 해제"
            onClick={(e) => {
              e.stopPropagation();
              onChange("all");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onChange("all");
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "rgba(235, 100, 28, 0.15)",
              color: "var(--seed-color-fg-brand, #eb641c)",
              marginLeft: 2,
              fontSize: 11,
              fontWeight: "bold",
              lineHeight: 1,
            }}
          >
            ✕
          </span>
        ) : (
          <span aria-hidden="true" style={{ fontSize: 10, color: "var(--seed-color-fg-neutral-muted, #888)", marginLeft: 2 }}>
            ▾
          </span>
        )}
      </button>

      {/* 블로그 검색 및 선택 바텀시트 / 모달 */}
      {open && (
        <div
          role="presentation"
          onClick={handleClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1050,
            background: "rgba(25, 27, 30, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            overscrollBehavior: "contain",
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="블로그 선택"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, 100%)",
              maxHeight: "min(78dvh, 600px)",
              background: "var(--seed-color-bg-layer-default, #fff)",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
              animation: "fadeInUp 0.2s ease-out",
            }}
          >
            {/* 상단 헤더 */}
            <header
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px 12px",
                borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle, #f0f0f0)",
              }}
            >
              <Text as="h3" textStyle="t6Bold" color="fg.neutral">
                블로그 선택
              </Text>
              <button
                type="button"
                aria-label="닫기"
                onClick={handleClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: 0,
                  background: "var(--seed-color-bg-neutral-weak, #f4f4f5)",
                  color: "var(--seed-color-fg-neutral, #555)",
                  cursor: "pointer",
                  fontSize: 18,
                  display: "grid",
                  placeItems: "center",
                  lineHeight: 1,
                  touchAction: "manipulation",
                }}
              >
                ✕
              </button>
            </header>

            {/* 실시간 검색창 */}
            <div style={{ padding: "14px 20px 8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "var(--seed-color-bg-neutral-weak, #f8f9fa)",
                  border: "1px solid var(--seed-color-stroke-neutral-subtle, #e5e5e5)",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 15, color: "#888" }}>🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="블로그 이름 검색 (ex: 토스, 당근, toss...)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    flex: 1,
                    border: 0,
                    background: "transparent",
                    fontSize: 14,
                    outline: "none",
                    color: "var(--seed-color-fg-neutral, #111)",
                    fontFamily: "inherit",
                  }}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="검색어 지우기"
                    onClick={() => setSearch("")}
                    style={{
                      border: 0,
                      background: "none",
                      color: "#9ca3af",
                      fontSize: 14,
                      cursor: "pointer",
                      padding: 2,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 블로그 목록 */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                padding: "6px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {/* '전체 블로그' 옵션 */}
              <button
                type="button"
                onClick={() => {
                  onChange("all");
                  handleClose();
                }}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: 0,
                  background: current === "all" ? "var(--seed-color-bg-brand-weak, #fff5ee)" : "transparent",
                  color: current === "all" ? "var(--seed-color-fg-brand, #eb641c)" : "var(--seed-color-fg-neutral, #222)",
                  fontWeight: current === "all" ? 700 : 500,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background-color 0.1s ease",
                  touchAction: "manipulation",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span aria-hidden="true" style={{ fontSize: 16 }}>🌐</span>
                  <span>{ALL_LABEL}</span>
                </div>
                {current === "all" && <span aria-hidden="true" style={{ fontWeight: "bold" }}>✓</span>}
              </button>

              {/* 검색 결과 리스트 */}
              {filteredSources.map((s) => {
                const isSelected = current === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onChange(s.id);
                      handleClose();
                    }}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: 0,
                      background: isSelected ? "var(--seed-color-bg-brand-weak, #fff5ee)" : "transparent",
                      color: isSelected ? "var(--seed-color-fg-brand, #eb641c)" : "var(--seed-color-fg-neutral, #222)",
                      fontWeight: isSelected ? 700 : 400,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background-color 0.1s ease",
                      touchAction: "manipulation",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {s.faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.faviconUrl}
                          alt=""
                          width={18}
                          height={18}
                          style={{ borderRadius: 4, flexShrink: 0 }}
                        />
                      ) : (
                        <span aria-hidden="true" style={{ fontSize: 16, flexShrink: 0 }}>🏢</span>
                      )}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.label}
                      </span>
                    </div>
                    {isSelected && <span aria-hidden="true" style={{ fontWeight: "bold", marginLeft: 8 }}>✓</span>}
                  </button>
                );
              })}

              {filteredSources.length === 0 && (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--seed-color-fg-neutral-muted, #888)", fontSize: 13 }}>
                  검색 결과와 일치하는 블로그가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
