"use client";

export interface SourceOption {
  id: string;
  label: string;
}

export function SourceFilterSelect({
  sources,
  current,
  onChange,
}: {
  sources: SourceOption[];
  current: string; // "all" 또는 source id
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label="소스 필터"
      value={current}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid var(--seed-color-stroke-neutral)",
        background: "var(--seed-color-bg-layer-default)",
        color: "var(--seed-color-fg-neutral)",
        fontSize: 14,
      }}
    >
      <option value="all">전체 소스</option>
      {sources.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
