"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@seed-design/react";
import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { SearchInput } from "./search-input";

// seed-design TextField(input)의 min-height가 52px로 고정돼 있어 (.seed-text-input__root) 접힌 상태의
// 원형 버튼도 같은 52px로 맞춘다 — 다르면 펼치고 접을 때마다 이 줄의 높이가 바뀌어 배지/전체읽음 버튼이
// 살짝씩 흔들리는 것처럼 보였다.
const COLLAPSED_SIZE = 52;
const EXPANDED_WIDTH = 240;

/**
 * 평소엔 돋보기 아이콘만 보이다가 클릭하면 그 자리에서 입력창으로 확장되는 검색 UI.
 * 검색어가 있는 동안은 접히지 않는다 — 지운 뒤 바깥을 클릭하거나 Esc를 눌러야 접힌다
 * (입력 중 실수로 포커스가 빠져나가 검색어가 사라지는 걸 막기 위함).
 */
export function ExpandableSearch({
  value,
  onValueChange,
  onSubmit,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: () => void;
}) {
  const [expanded, setExpanded] = useState(value.trim().length > 0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;

    function collapseIfEmpty() {
      if (!value.trim()) setExpanded(false);
    }
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) collapseIfEmpty();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") collapseIfEmpty();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded, value]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        alignItems: "center",
        // 실제 입력창(TextField) 높이가 40px보다 커서, 여기 높이를 40으로 고정하고 overflow:hidden을
        // 걸면 둥근 테두리 위아래가 잘려 보였다 — 높이는 내용에 맞기고 너비만 애니메이션한다.
        // TextField 쪽 너비가 이 컨테이너의 100%라 폭이 넘칠 일이 없어 overflow도 필요 없다.
        width: expanded ? EXPANDED_WIDTH : COLLAPSED_SIZE,
        transition: "width 180ms ease",
        flexShrink: 0,
      }}
    >
      {expanded ? (
        <SearchInput value={value} onValueChange={onValueChange} onSubmit={onSubmit} autoFocus />
      ) : (
        <button
          type="button"
          aria-label="검색 열기"
          onClick={() => setExpanded(true)}
          style={{
            width: COLLAPSED_SIZE,
            height: COLLAPSED_SIZE,
            borderRadius: "50%",
            border: "1px solid var(--seed-color-stroke-neutral-subtle)",
            background: "var(--seed-color-bg-layer-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Icon svg={<IconMagnifyingglassLine />} />
        </button>
      )}
    </div>
  );
}
