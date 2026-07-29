import Link from "next/link";
import { countUnreadArticles, listArticles, type ArticleFilter } from "@/lib/data/articles";
import { listSources } from "@/lib/data/sources";
import { ArticleRow } from "@/components/article-row";
import { ArticleFilterTabs } from "@/components/article-filter-tabs";
import { SourceFilterSelect } from "@/components/source-filter-select";

export const dynamic = "force-dynamic";

function parseFilter(raw: string | undefined): ArticleFilter {
  return raw === "read" || raw === "all" ? raw : "unread";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; source?: string }>;
}) {
  const { filter: rawFilter, source: sourceId } = await searchParams;
  const filter = parseFilter(rawFilter);

  const [articles, unreadCount, sources] = await Promise.all([
    listArticles({ filter, sourceId }),
    countUnreadArticles(),
    listSources(),
  ]);

  const sourceOptions = sources
    .map((s) => ({ id: s.id, label: s.title ?? s.site_url }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  return (
    <main style={{ padding: 40, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>글 목록{unreadCount > 0 && ` (안읽음 ${unreadCount})`}</h1>
        <Link href="/sources">소스 관리</Link>
      </div>

      <div style={{ margin: "16px 0", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <ArticleFilterTabs current={filter} />
        <SourceFilterSelect sources={sourceOptions} current={sourceId ?? "all"} filter={filter} />
      </div>

      <ul style={{ display: "flex", flexDirection: "column", listStyle: "none", padding: 0, margin: 0 }}>
        {articles.map((article) => (
          <ArticleRow key={article.id} article={article} />
        ))}
      </ul>
      {articles.length === 0 && <p>표시할 글이 없습니다.</p>}
    </main>
  );
}
