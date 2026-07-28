import Link from "next/link";
import { listSources } from "@/lib/data/sources";
import { AddSourceForm } from "@/components/add-source-form";
import { BulkAddSourceForm } from "@/components/bulk-add-source-form";
import { SourceRow } from "@/components/source-row";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await listSources();

  return (
    <main style={{ padding: 40, display: "flex", flexDirection: "column", gap: 40, maxWidth: 720 }}>
      <div>
        <Link href="/">← 글 목록으로</Link>
        <h1>소스 관리</h1>
      </div>

      <section>
        <h2>단건 등록</h2>
        <AddSourceForm />
      </section>

      <section>
        <h2>일괄 등록</h2>
        <BulkAddSourceForm />
      </section>

      <section>
        <h2>등록된 소스 ({sources.length})</h2>
        <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0 }}>
          {sources.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
          {sources.length === 0 && <p>아직 등록된 소스가 없습니다.</p>}
        </ul>
      </section>
    </main>
  );
}
