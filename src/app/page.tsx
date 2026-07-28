import Link from "next/link";
import { countUnreadArticles, listArticles, type ArticleFilter } from "@/lib/data/articles";
import { ArticleRow } from "@/components/article-row";
import { ArticleFilterTabs } from "@/components/article-filter-tabs";

export const dynamic = "force-dynamic";

function parseFilter(raw: string | undefined): ArticleFilter {
  return raw === "read" || raw === "all" ? raw : "unread";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = parseFilter(rawFilter);

  const [articles, unreadCount] = await Promise.all([listArticles({ filter }), countUnreadArticles()]);

  return (
    <main style={{ padding: 40, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>글 목록{unreadCount > 0 && ` (안읽음 ${unreadCount})`}</h1>
        <Link href="/sources">소스 관리</Link>
      </div>

      <div style={{ margin: "16px 0" }}>
        <ArticleFilterTabs current={filter} />
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
