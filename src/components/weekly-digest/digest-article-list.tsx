import { Text } from "@seed-design/react";
import type { DigestArticle } from "@/lib/data/weekly-digests";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function shortExcerpt(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 180)}…` : compact;
}

export function DigestArticleList({ articles, totalCount }: { articles: DigestArticle[]; totalCount: number }) {
  return (
    <section aria-labelledby="latest-articles" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Text as="h2" id="latest-articles" textStyle="t6Bold" color="fg.neutral">
          이번 주 최신 기사
        </Text>
        <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
          원문은 각 블로그에서 읽을 수 있어요. 이 페이지에는 제목과 짧은 기존 요약만 담습니다.
          {totalCount > articles.length ? ` 최신 ${articles.length}개를 표시합니다.` : ""}
        </Text>
      </div>

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
        {articles.map((article) => (
          <li key={article.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)" }}>
            <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
                  {article.source?.title ?? article.source?.site_url ?? "알 수 없는 소스"}
                </Text>
                <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
                  · {formatDate(article.published_at)}
                </Text>
              </div>
              <Text as="h3" textStyle="t5Bold" color="fg.neutral">
                {article.title} ↗
              </Text>
              {article.excerpt && (
                <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
                  {shortExcerpt(article.excerpt)}
                </Text>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
