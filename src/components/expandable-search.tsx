"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@seed-design/react";
import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { SearchInput } from "./search-input";

// seed-design TextField(input)의 min-height가 52px로 고정돼 있어 (.seed-text-input__root) 접힌 상태의
// 원형 버튼도 같은 52px로 맞춘다 — 다르면 펼치고 접을 때마다 이 줄의 높이가 바뀌어 배지/전체읽음 버튼이
// 살짝씩 흔들리는 것처럼 보였다.
const COLLAPSED_SIZE = 52;

/**
 * 평소엔 돋보기 아이콘만 보이다가 클릭하면 그 자리에서 입력창으로 확장되는 검색 UI.
 * 검색어가 있는 동안은 접히지 않는다 — 지운 뒤 바깥을 클릭하거나 Esc를 눌러야 접힌다
 * (입력 중 실수로 포커스가 빠져나가 검색어가 사라지는 걸 막기 위함).
 * expanded는 부모(ArticleList)가 들고 있다 — 펼쳐졌을 때 배지/전체읽음 버튼을 함께 숨겨서
 * 좁은 화면에서 검색창+배지+버튼 4개가 한 줄에 다 안 들어가 두 단으로 겹쳐 접히며
 * 아래 내용이 크게 밀려나던 문제를 부모 쪽에서 같이 해결한다.
 */
export function ExpandableSearch({
  value,
  onValueChange,
  onSubmit,
  expanded,
  onExpandedChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: () => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;

    function collapseIfEmpty() {
      if (!value.trim()) onExpandedChange(false);
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
  }, [expanded, value, onExpandedChange]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        alignItems: "center",
        // 펼쳤을 때는 고정폭 대신 이 컨테이너가 속한 줄 전체를 차지해, 검색창 자체가
        // 화면 폭에 맞춰 자연스럽게 늘어나게 한다(부모가 배지/버튼을 숨겨줘서 이 줄엔
        // 이제 검색창만 있음).
        width: expanded ? "100%" : COLLAPSED_SIZE,
        flexShrink: 0,
      }}
    >
      {expanded ? (
        <SearchInput value={value} onValueChange={onValueChange} onSubmit={onSubmit} autoFocus />
      ) : (
        <button
          type="button"
          aria-label="검색 열기"
          onClick={() => onExpandedChange(true)}
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
