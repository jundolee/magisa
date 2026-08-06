"use client";

import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

export function SearchInput({
  value,
  onValueChange,
  isPending,
}: {
  value: string;
  onValueChange: (value: string) => void;
  isPending?: boolean;
}) {
  return (
    <TextField
      prefixIcon={<IconMagnifyingglassLine />}
      value={value}
      onValueChange={(v) => onValueChange(v.value)}
      style={{ maxWidth: 360, width: "100%" }}
    >
      <TextFieldInput aria-label="글 검색" placeholder={isPending ? "검색 중…" : "제목/요약 검색"} />
    </TextField>
  );
}
