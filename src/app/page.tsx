import Link from "next/link";
import { listArticles, type ArticleFilter } from "@/lib/data/articles";
import { listSources } from "@/lib/data/sources";
import { ArticleList } from "@/components/article-list";

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
  const initialFilter = parseFilter(rawFilter);

  // 탭/소스 필터 전환마다 서버를 다시 왕복하지 않도록, 전체 글/소스를 한 번만 불러와
  // 클라이언트(ArticleList)에서 즉시 필터링한다 (docs/decisions.md 참고).
  const [articles, sources] = await Promise.all([listArticles(), listSources()]);

  const sourceOptions = sources
    .map((s) => ({ id: s.id, label: s.title ?? s.site_url }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  return (
    <main style={{ padding: 40, maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/sources">소스 관리</Link>
      </div>

      <ArticleList
        articles={articles}
        sources={sourceOptions}
        initialFilter={initialFilter}
        initialSourceId={sourceId ?? "all"}
      />
    </main>
  );
}
