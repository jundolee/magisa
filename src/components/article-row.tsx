import { AspectRatio, Badge, Text } from "@seed-design/react";
import { ArticleLink } from "./article-link";
import { UnreadToggleForm } from "./unread-toggle-form";
import type { ArticleListItem } from "@/lib/data/articles";

const MUTED = "var(--seed-color-fg-neutral-muted)";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function ArticleRow({ article }: { article: ArticleListItem }) {
  return (
    <li
      style={{
        display: "flex",
        gap: 20,
        padding: "20px 0",
        borderBottom: "1px solid var(--seed-color-stroke-neutral)",
        opacity: article.is_read ? 0.55 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <Badge size="medium" variant="weak" tone="neutral">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            {article.source?.favicon_url && (
              // eslint-disable-next-line @next/next/no-img-element -- 임의의 외부 도메인 파비콘
              <img
                src={article.source.favicon_url}
                alt=""
                width={14}
                height={14}
                loading="lazy"
                decoding="async"
                style={{ borderRadius: 3, flexShrink: 0 }}
              />
            )}
            {article.source?.title ?? article.source?.site_url}
          </span>
        </Badge>

        {/* 썸네일뿐 아니라 제목/요약/날짜 전부 클릭 가능해야 해서 하나의 링크로 묶는다 */}
        <ArticleLink articleId={article.id} href={article.url} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Text as="h3" textStyle="t7Bold" color="fg.neutral" maxLines={2}>
            {article.title}
          </Text>

          {article.excerpt && (
            <Text as="p" textStyle="t4Regular" color={MUTED} maxLines={2}>
              {article.excerpt}
            </Text>
          )}

          <Text as="span" textStyle="t2Regular" color={MUTED}>
            {formatDate(article.published_at)}
          </Text>
        </ArticleLink>

        {article.is_read && <UnreadToggleForm articleId={article.id} />}
      </div>

      {/* 썸네일 유무와 무관하게 항상 같은 112x112 규격을 유지 — 없는 글은 빈 플레이스홀더로 채워 목록 전체의 정렬을 맞춘다 */}
      <ArticleLink articleId={article.id} href={article.url} style={{ flexShrink: 0, display: "block" }}>
        <AspectRatio
          ratio={1}
          width="112px"
          style={{ borderRadius: 8, overflow: "hidden", background: "var(--seed-color-bg-neutral-weak)" }}
        >
          {article.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- 임의의 외부 도메인 썸네일이라 next/image 최적화 대상 밖
            <img
              src={article.thumbnail_url}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%" }} />
          )}
        </AspectRatio>
      </ArticleLink>
    </li>
  );
}
