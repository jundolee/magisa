import { Text } from "@seed-design/react";
import { listSources } from "@/lib/data/sources";
import { AddSourceForm } from "@/components/add-source-form";
import { BulkAddSourceForm } from "@/components/bulk-add-source-form";
import { SourceRow } from "@/components/source-row";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await listSources();

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <PageHeader navHref="/" navLabel="글 목록" />

      <Text as="h1" textStyle="t8Bold" color="fg.neutral">
        소스 관리
      </Text>

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Text as="h2" textStyle="t6Bold" color="fg.neutral">
          단건 등록
        </Text>
        <AddSourceForm />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Text as="h2" textStyle="t6Bold" color="fg.neutral">
          일괄 등록
        </Text>
        <BulkAddSourceForm />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Text as="h2" textStyle="t6Bold" color="fg.neutral">
          등록된 소스 ({sources.length})
        </Text>
        <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0 }}>
          {sources.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
          {sources.length === 0 && (
            <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
              아직 등록된 소스가 없습니다.
            </Text>
          )}
        </ul>
      </section>
    </main>
  );
}
