import { AspectRatio, Badge, Text } from "@seed-design/react";
import { ArticleLink } from "./article-link";
import { UnreadToggleForm } from "./unread-toggle-form";
import { FavoriteToggleForm } from "./favorite-toggle-form";
import { ShareButton } from "./share-button";
import type { ArticleListItem } from "@/lib/data/articles";

const MUTED = "var(--seed-color-fg-neutral-muted)";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function ArticleRow({
  article,
  onRead,
  priority = false,
}: {
  article: ArticleListItem;
  onRead?: (articleId: string) => void;
  // 화면에 처음부터 보이는 상단 몇 개는 lazy 대신 즉시 fetch — loading="lazy"는 브라우저가
  // 뷰포트 안인지 확인할 때까지 fetch 시작 자체를 늦추므로, 이미 보이는 이미지에 걸면
  // 오히려 첫 화면 체감 로딩(LCP)이 늦어진다.
  priority?: boolean;
}) {
  return (
    <li
      style={{
        display: "flex",
        gap: 20,
        padding: "20px 0",
        borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)",
        opacity: article.is_read ? 0.55 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <Badge size="medium" variant="weak" tone="neutral">
          {/* SEED Badge는 라벨을 고정 px 너비로 재고 overflow:hidden + ellipsis를 적용하는데,
              그 계산은 순수 텍스트를 가정한다 — 파비콘까지 담은 inline-flex를 통째로 넣으면
              래퍼가 그 너비를 무시하고 원래 크기로 그려져 ellipsis 없이 글자가 중간에서 잘린다.
              래퍼에 maxWidth:100%로 라벨 너비를 따르게 하고, 텍스트 쪽에만 별도로
              ellipsis를 줘서 잘리는 지점에 실제로 "…"가 보이게 한다. */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, maxWidth: "100%", minWidth: 0 }}>
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
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
              {article.source?.title ?? article.source?.site_url}
            </span>
          </span>
        </Badge>

        {/* 썸네일뿐 아니라 제목/요약/날짜 전부 클릭 가능해야 해서 하나의 링크로 묶는다 */}
        <ArticleLink
          articleId={article.id}
          articleTitle={article.title}
          href={article.url}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
          onRead={onRead}
        >
          <Text as="h3" textStyle="t7Bold" color="fg.neutral" maxLines={2}>
            {article.title}
          </Text>

          {article.excerpt && (
            <Text as="p" textStyle="t4Regular" color={MUTED} maxLines={2}>
              {article.excerpt}
            </Text>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text as="span" textStyle="t2Regular" color={MUTED}>
              {formatDate(article.published_at)}
            </Text>
            <Text as="span" textStyle="t2Regular" color={MUTED}>
              클릭수 : {article.click_count}
            </Text>
          </div>
        </ArticleLink>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FavoriteToggleForm articleId={article.id} isFavorite={article.is_favorite} />
          {article.is_read && <UnreadToggleForm articleId={article.id} />}
          <ShareButton title={article.title} url={article.url} />
        </div>
      </div>

      {/* 썸네일 유무와 무관하게 항상 같은 112x112 규격을 유지 — 없는 글은 빈 플레이스홀더로 채워 목록 전체의 정렬을 맞춘다 */}
      <ArticleLink
        articleId={article.id}
        articleTitle={article.title}
        href={article.url}
        style={{ flexShrink: 0, display: "block" }}
        onRead={onRead}
      >
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
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
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
