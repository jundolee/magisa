import type { Metadata } from "next";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { listSources } from "@/lib/data/sources";
import { listPendingSourceSuggestions } from "@/lib/data/source-suggestions";
import { AddSourceForm } from "@/components/add-source-form";
import { BulkAddSourceForm } from "@/components/bulk-add-source-form";
import { SourceRow } from "@/components/source-row";
import { PageHeader } from "@/components/page-header";
import { IngestAllButton } from "@/components/ingest-all-button";
import { reviewSourceSuggestionAction } from "./actions";

export const dynamic = "force-dynamic";

// 관리자 전용 화면 — 검색엔진에 노출되면 안 된다 (홈 화면에도 눈에 띄는 링크를 두지 않음, docs/decisions.md 참고).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SourcesPage() {
  const [sources, suggestions] = await Promise.all([
    listSources(),
    // 추천 목록 조회가 실패해도(예: 마이그레이션 미적용) 소스 관리 자체는 계속 동작해야 한다 —
    // 관리자의 핵심 기능(등록/삭제/일시중지)을 부가 기능 하나 때문에 통째로 막으면 안 됨.
    listPendingSourceSuggestions().catch(() => []),
  ]);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <PageHeader navHref="/" navLabel="글 목록" />

      <Text as="h1" textStyle="t8Bold" color="fg.neutral">
        소스 관리
      </Text>

      {suggestions.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Text as="h2" textStyle="t6Bold" color="fg.neutral">
            블로그 추천 ({suggestions.length})
          </Text>
          <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0 }}>
            {suggestions.map((s) => (
              <li
                key={s.id}
                style={{
                  border: "1px solid var(--seed-color-stroke-neutral-subtle)",
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    <Text as="span" textStyle="t5Bold" color="fg.neutral">
                      {s.url}
                    </Text>
                  </a>
                  {s.note && (
                    <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
                      {s.note}
                    </Text>
                  )}
                </div>
                <form action={reviewSourceSuggestionAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <ActionButton type="submit" variant="neutralWeak" size="small">
                    확인함
                  </ActionButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Text as="h2" textStyle="t6Bold" color="fg.neutral">
            등록된 소스 ({sources.length})
          </Text>
          <IngestAllButton
            sources={sources
              .filter((s) => s.is_active)
              .map((s) => ({ id: s.id, label: s.title ?? s.site_url }))}
          />
        </div>
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
