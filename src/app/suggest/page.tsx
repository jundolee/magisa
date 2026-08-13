import type { Metadata } from "next";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { PageHeader } from "@/components/page-header";
import { suggestSourceAction } from "./actions";

export const metadata: Metadata = {
  title: "블로그 추천하기 — Magisa",
  description: "매기사가 모았으면 하는 테크 블로그를 추천해주세요.",
};

export default async function SuggestPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { done, error } = await searchParams;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader navHref="/" navLabel="글 목록" />

      <Text as="h1" textStyle="t8Bold" color="fg.neutral">
        블로그 추천하기
      </Text>
      <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
        매기사가 모았으면 하는 테크 블로그가 있나요? 주소만 남겨주시면 검토 후 추가할게요.
      </Text>

      <form
        action={suggestSourceAction}
        style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}
      >
        <TextField name="url" label="블로그 주소">
          <TextFieldInput type="url" placeholder="https://example.com" required autoFocus />
        </TextField>
        <TextField name="note" label="한마디 (선택)">
          <TextFieldTextarea placeholder="어떤 점이 좋은지 알려주시면 검토에 도움이 돼요" style={{ minHeight: 80 }} />
        </TextField>
        <ActionButton type="submit" size="small">
          추천하기
        </ActionButton>
      </form>

      {done && (
        <Text as="p" textStyle="t3Regular" color="fg.positive">
          감사합니다! 검토 후 추가할게요.
        </Text>
      )}
      {error && (
        <Text as="p" textStyle="t3Regular" color="fg.critical">
          {decodeURIComponent(error)}
        </Text>
      )}
    </main>
  );
}
