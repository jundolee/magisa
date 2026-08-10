"use client";

import { useState, type CSSProperties } from "react";
import { IconChevronDownLine } from "@karrotmarket/react-monochrome-icon";
import { FieldButton, FieldButtonValue } from "seed-design/ui/field-button";
import { MenuRoot, MenuAnchor, MenuContent, MenuGroup, MenuItem } from "seed-design/ui/menu";

export interface SourceOption {
  id: string;
  label: string;
}

const ALL_LABEL = "전체 소스";

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
  const currentLabel = current === "all" ? ALL_LABEL : sources.find((s) => s.id === current)?.label ?? ALL_LABEL;

  // maxWidth:"100%"는 부모(SEED의 .seed-menu-item__label)가 특정 텍스트(길거나 특수문자가
  // 섞인 경우)에서 자기 폭을 content 기준으로 잘못 계산해버리면 그 불안정한 값의 100%가 되어
  // 함께 무너진다 — 실제로 "마이리얼트립 블로그 | Myrealtrip Blog", "MUSINSA techblog —
  // 무신사 테크 블로그 - Medium" 두 소스명에서 ellipsis 없이 메뉴 밖으로 넘쳐 가로 스크롤이
  // 생기는 걸 확인함. 부모 크기와 무관하게 고정 px로 캡을 걸어 항상 안전하게 잘리도록 한다
  // (MenuContent minWidth 240 - 좌우 패딩/아이콘 여유 기준으로 여유있게 잡은 값).
  const labelStyle: CSSProperties = {
    display: "block",
    minWidth: 0,
    maxWidth: 190,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <MenuRoot open={open} onOpenChange={setOpen}>
      <MenuAnchor>
        <FieldButton
          size="medium"
          suffixIcon={<IconChevronDownLine />}
          style={{ minWidth: 160 }}
          buttonProps={{
            onClick: () => setOpen((v) => !v),
            "aria-label": "소스 필터",
            "aria-haspopup": "menu",
            "aria-expanded": open,
          }}
        >
          <FieldButtonValue>{currentLabel}</FieldButtonValue>
        </FieldButton>
      </MenuAnchor>
      <MenuContent style={{ minWidth: 240, maxWidth: 320 }}>
        <MenuGroup>
          <MenuItem label={<span style={labelStyle}>{ALL_LABEL}</span>} onClick={() => onChange("all")} />
          {sources.map((s) => (
            <MenuItem
              key={s.id}
              label={<span style={labelStyle}>{s.label}</span>}
              onClick={() => onChange(s.id)}
            />
          ))}
        </MenuGroup>
      </MenuContent>
    </MenuRoot>
  );
}
