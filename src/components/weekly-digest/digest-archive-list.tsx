import Link from "next/link";
import { Text } from "@seed-design/react";
import type { DigestArchiveItem } from "@/lib/data/weekly-digests";

export function DigestArchiveList({ items }: { items: DigestArchiveItem[] }) {
  if (items.length === 0) {
    return (
      <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
        아직 공개할 주간 아카이브가 없습니다.
      </Text>
    );
  }

  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((item) => (
        <li key={item.week}>
          <Link
            href={`/digest/${item.week}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: "18px 20px",
              border: "1px solid var(--seed-color-stroke-neutral-subtle)",
              borderRadius: 12,
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Text as="span" textStyle="t5Bold" color="fg.neutral">
                {item.label}
              </Text>
              <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
                {item.dateRangeLabel}
              </Text>
            </span>
            <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" style={{ whiteSpace: "nowrap" }}>
              {item.articleCount}개 →
            </Text>
          </Link>
        </li>
      ))}
    </ul>
  );
}
