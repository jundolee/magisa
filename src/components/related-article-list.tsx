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
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <Text as="h2" id="related-articles-heading" textStyle="t6Bold" color="fg.neutral" style={{ letterSpacing: "-0.02em" }}>
          관련 기사
        </Text>
        {hasSemantic && (
          <Badge size="medium" variant="weak" tone="brand">
            AI 의미 연결
          </Badge>
        )}
      </div>
      <Text as="p" textStyle="t2Regular" color={MUTED} style={{ marginBottom: 12 }}>
        {hasSemantic ? "AI 벡터 임베딩으로 분석한 기술적 연관 글이에요." : "주제나 기술 맥락이 닿는 글이에요."}
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
              <Link href={item.href} style={{ display: "block", padding: "14px 0", color: "inherit", textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
                  <Text as="span" textStyle="t2Regular" color={MUTED}>
                    {item.sourceTitle ?? "알 수 없는 소스"}
                    {category && ` · ${category}`}
                  </Text>
                  {item.isSemanticMatch && scorePercent !== null && (
                    <Badge size="medium" variant="outline" tone="brand">
                      {`연관도 ${scorePercent}%`}
                    </Badge>
                  )}
                </div>
                <Text
                  as="h3"
                  textStyle="t4Bold"
                  color="fg.neutral"
                  style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, lineHeight: 1.45 }}
                >
                  <span>{item.title}</span>
                  <span aria-hidden="true" style={{ color: MUTED, flexShrink: 0, fontSize: 16 }}>
                    ↗
                  </span>
                </Text>
                {publishedAt && (
                  <time dateTime={item.publishedAt ?? undefined} style={{ display: "block", marginTop: 6, color: MUTED, fontSize: 13, lineHeight: 1.4 }}>
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
