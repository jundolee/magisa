"use client";

import type { KeyboardEvent } from "react";
import { Icon } from "@seed-design/react";
import { IconMagnifyingglassLine, IconXmarkCircleFill } from "@karrotmarket/react-monochrome-icon";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

export function SearchInput({
  value,
  onValueChange,
  onSubmit,
  autoFocus,
  onBlur,
}: {
  value: string;
  onValueChange: (value: string) => void;
  /** Enter로 명시적으로 즉시 검색을 요청할 때 (디바운스/한 글자 보류를 건너뛴다). */
  onSubmit?: () => void;
  autoFocus?: boolean;
  onBlur?: () => void;
}) {
  return (
    <TextField
      prefixIcon={<IconMagnifyingglassLine />}
      value={value}
      onValueChange={(v) => onValueChange(v.value)}
      suffix={
        value ? (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => onValueChange("")}
            style={{
              display: "flex",
              alignItems: "center",
              border: "none",
              background: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--seed-color-fg-neutral-muted)",
            }}
          >
            <Icon svg={<IconXmarkCircleFill />} />
          </button>
        ) : undefined
      }
      style={{ width: "100%" }}
    >
      <TextFieldInput
        aria-label="글 검색"
        placeholder="제목/요약 검색"
        autoFocus={autoFocus}
        onBlur={onBlur}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") onSubmit?.();
        }}
      />
    </TextField>
  );
}
