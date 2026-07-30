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

  const labelStyle: CSSProperties = {
    display: "block",
    minWidth: 0,
    maxWidth: "100%",
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
