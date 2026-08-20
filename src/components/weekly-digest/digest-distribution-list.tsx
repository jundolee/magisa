import { Text } from "@seed-design/react";
import type { DigestDistributionItem } from "@/lib/data/weekly-digests";

export function DigestDistributionList({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: DigestDistributionItem[];
}) {
  return (
    <section aria-labelledby={id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Text as="h2" id={id} textStyle="t6Bold" color="fg.neutral">
        {title}
      </Text>
      <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <li key={item.label} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
              <Text as="span" textStyle="t3Regular" color="fg.neutral">
                {item.label}
              </Text>
              <span
                aria-hidden="true"
                style={{ height: 6, overflow: "hidden", borderRadius: 999, background: "var(--seed-color-bg-neutral-weak)" }}
              >
                <span
                  style={{ display: "block", width: `${item.percentage}%`, minWidth: item.percentage ? 6 : 0, height: "100%", background: "var(--seed-color-bg-brand-solid)" }}
                />
              </span>
            </span>
            <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ whiteSpace: "nowrap" }}>
              {item.count}개 · {item.percentage}%
            </Text>
          </li>
        ))}
      </ol>
    </section>
  );
}
