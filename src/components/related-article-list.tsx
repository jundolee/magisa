import Link from "next/link";
import { Badge, Text } from "@seed-design/react";
import { CATEGORY_MAP, type CategoryId } from "@/lib/categories";

const MUTED = "var(--seed-color-fg-neutral-muted)";

export interface RelatedArticleListItem {
  id: string;
  title: string;
  sourceTitle: string | null;
  category: string | null;
  publishedAt: string | null;
  href: string;
  similarityScore?: number | null;
  isSemanticMatch?: boolean;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function categoryLabel(category: string | null): string | null {
  if (!category) return null;
  return CATEGORY_MAP.get(category as CategoryId)?.label ?? category;
}

export function RelatedArticleList({ items }: { items: RelatedArticleListItem[] }) {
  if (items.length === 0) return null;

  const hasSemantic = items.some((item) => item.isSemanticMatch);

  return (
    <section aria-labelledby="related-articles-heading" style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 3 }}>
        <Text as="h2" id="related-articles-heading" textStyle="t4Bold" color="fg.neutral">
          관련 기사
        </Text>
      </div>
      <Text as="p" textStyle="t1Regular" color={MUTED} style={{ marginBottom: 8 }}>
        {hasSemantic ? "AI 벡터 임베딩으로 분석한 기술적 연관 글" : "주제나 기술 맥락이 닿는 글"}
      </Text>

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
        {items.map((item) => {
          const category = categoryLabel(item.category);
          const publishedAt = formatDate(item.publishedAt);
          const scorePercent = typeof item.similarityScore === "number"
            ? Math.max(1, Math.min(99, Math.round(item.similarityScore * 100)))
            : null;

          return (
            <li
              key={item.id}
              style={{ borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)" }}
            >
              <Link href={item.href} style={{ display: "block", padding: "12px 0", color: "inherit" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
                  <Text as="span" textStyle="t1Regular" color={MUTED}>
                    {item.sourceTitle ?? "알 수 없는 소스"}
                    {category && ` · ${category}`}
                  </Text>
                  {item.isSemanticMatch && scorePercent !== null && (
                    <Badge size="medium" variant="weak" tone="brand">
                      {`연관도 ${scorePercent}%`}
                    </Badge>
                  )}
                </div>
                <Text
                  as="h3"
                  textStyle="t3Bold"
                  color="fg.neutral"
                  style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, lineHeight: 1.45 }}
                >
                  <span>{item.title}</span>
                  <span aria-hidden="true" style={{ color: MUTED, flexShrink: 0, fontSize: 14 }}>
                    ↗
                  </span>
                </Text>
                {publishedAt && (
                  <time dateTime={item.publishedAt ?? undefined} style={{ display: "block", marginTop: 4, color: MUTED, fontSize: 14, lineHeight: 1.4 }}>
                    {publishedAt}
                  </time>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
