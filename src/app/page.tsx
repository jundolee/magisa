import Link from "next/link";
import { listArticles } from "@/lib/data/articles";
import { ArticleRow } from "@/components/article-row";

export const dynamic = "force-dynamic";

export default async function Home() {
  const articles = await listArticles();
  const unreadCount = articles.filter((a) => !a.is_read).length;

  return (
    <main style={{ padding: 40, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>글 목록{unreadCount > 0 && ` (안읽음 ${unreadCount})`}</h1>
        <Link href="/sources">소스 관리</Link>
      </div>
      <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0 }}>
        {articles.map((article) => (
          <ArticleRow key={article.id} article={article} />
        ))}
      </ul>
      {articles.length === 0 && <p>아직 수집된 글이 없습니다. 먼저 소스를 등록해주세요.</p>}
    </main>
  );
}
