"use client";

import { Badge, Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { toggleSourceActiveAction, deleteSourceAction } from "@/app/sources/actions";
import { IngestNowButton } from "./ingest-now-button";
import type { Source } from "@/lib/data/sources";

const MUTED = "var(--seed-color-fg-neutral-muted)";

function formatCheckedAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SourceRow({ source }: { source: Source }) {
  const checkedAt = formatCheckedAt(source.last_checked_at);

  return (
    <li
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
      {/* minWidth를 0 대신 지정해 좁은 화면에서 버튼 3개(지금 수집/일시중지/삭제)에 밀려 이 텍스트
          컬럼이 한 글자씩 세로로 쪼그라들지 않고, 그 전에 버튼 묶음이 다음 줄로 넘어가도록 한다. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {source.favicon_url && (
            // eslint-disable-next-line @next/next/no-img-element -- 임의의 외부 도메인 파비콘
            <img
              src={source.favicon_url}
              alt=""
              width={18}
              height={18}
              style={{ borderRadius: 4, flexShrink: 0 }}
            />
          )}
          <Text as="strong" textStyle="t5Bold" color="fg.neutral">
            {source.title ?? source.site_url}
          </Text>
          {!source.is_active && (
            <Badge size="medium" variant="weak" tone="warning">
              일시중지됨
            </Badge>
          )}
        </div>
        <Text as="span" textStyle="t2Regular" color={MUTED}>
          {source.site_url} · {source.feed_type.toUpperCase()}
        </Text>
        {checkedAt && (
          <Text as="span" textStyle="t2Regular" color={MUTED}>
            마지막 확인: {checkedAt}
          </Text>
        )}
        {source.last_error && (
          <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-critical)">
            마지막 오류: {source.last_error}
          </Text>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "flex-start" }}>
        <IngestNowButton sourceId={source.id} />
        <form action={toggleSourceActiveAction}>
          <input type="hidden" name="id" value={source.id} />
          <input type="hidden" name="nextActive" value={(!source.is_active).toString()} />
          <ActionButton type="submit" variant="neutralWeak" size="small">
            {source.is_active ? "일시중지" : "재개"}
          </ActionButton>
        </form>
        <form
          action={deleteSourceAction}
          onSubmit={(e) => {
            if (!confirm(`"${source.site_url}"을(를) 삭제할까요?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={source.id} />
          <ActionButton type="submit" variant="criticalSolid" size="small">
            삭제
          </ActionButton>
        </form>
      </div>
    </li>
  );
}
