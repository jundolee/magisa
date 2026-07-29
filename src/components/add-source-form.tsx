"use client";

import { useActionState, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { addSourceFlowAction, type AddSourceFlowState } from "@/app/sources/actions";

const initialState: AddSourceFlowState = {
  ok: true,
  message: "",
  step: "idle",
  siteUrl: "",
  feedType: "unknown",
  feedUrl: null,
  scrapeConfig: null,
  preview: [],
};

export function AddSourceForm() {
  const [state, formAction, isPending] = useActionState(addSourceFlowAction, initialState);
  const [advancedOpen, setAdvancedOpen] = useState(
    () =>
      !!(
        state.scrapeConfig?.linkSelector ||
        state.scrapeConfig?.excerptSelector ||
        state.scrapeConfig?.dateSelector ||
        state.scrapeConfig?.thumbnailSelector
      )
  );

  const showScrapeConfigEditor = state.step === "previewed" && state.feedType === "scrape";
  const showConfirmButton = state.step === "previewed" && state.preview.length > 0;

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
      <TextField name="siteUrl" label="블로그 홈 URL">
        <TextFieldInput type="url" placeholder="https://example.com" required defaultValue={state.siteUrl} />
      </TextField>

      {showScrapeConfigEditor && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 12,
            border: "1px solid var(--seed-color-stroke-neutral)",
            borderRadius: 8,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--seed-color-fg-neutral-muted)", margin: 0 }}>
            RSS가 없어서 아래 항목으로 목록을 추출해요. 자동으로 채워진 값이 이상하면 직접 수정하고 다시
            미리보기 해주세요.
          </p>

          <TextField name="listItemSelector" label="목록 항목 선택자">
            <TextFieldInput
              placeholder="예: article.post-card"
              required
              defaultValue={state.scrapeConfig?.listItemSelector ?? ""}
            />
          </TextField>

          <TextField name="titleSelector" label="제목 선택자">
            <TextFieldInput
              placeholder="예: h2 또는 .title"
              required
              defaultValue={state.scrapeConfig?.titleSelector ?? ""}
            />
          </TextField>

          <ActionButton
            type="button"
            variant="ghost"
            size="xsmall"
            onClick={() => setAdvancedOpen((v) => !v)}
            style={{ alignSelf: "flex-start" }}
          >
            {advancedOpen ? "추가 설정 접기" : "추가 설정 (링크·요약·날짜·썸네일)"}
          </ActionButton>

          {advancedOpen && (
            <>
              <TextField name="linkSelector" label="링크 선택자 (비워두면 목록 항목 자체가 링크)">
                <TextFieldInput placeholder="예: a" defaultValue={state.scrapeConfig?.linkSelector ?? ""} />
              </TextField>
              <TextField name="excerptSelector" label="요약 선택자 (선택)">
                <TextFieldInput
                  placeholder="예: .description"
                  defaultValue={state.scrapeConfig?.excerptSelector ?? ""}
                />
              </TextField>
              <TextField name="dateSelector" label="날짜 선택자 (선택)">
                <TextFieldInput placeholder="예: time" defaultValue={state.scrapeConfig?.dateSelector ?? ""} />
              </TextField>
              <TextField name="thumbnailSelector" label="썸네일 선택자 (선택)">
                <TextFieldInput placeholder="예: img" defaultValue={state.scrapeConfig?.thumbnailSelector ?? ""} />
              </TextField>
            </>
          )}
        </div>
      )}

      <input type="hidden" name="feedType" value={state.feedType} />
      <input type="hidden" name="feedUrl" value={state.feedUrl ?? ""} />

      <div style={{ display: "flex", gap: 8 }}>
        <ActionButton
          type="submit"
          name="intent"
          value="preview"
          loading={isPending}
          size="small"
          variant="neutralOutline"
        >
          미리보기
        </ActionButton>
        {showConfirmButton && (
          <ActionButton type="submit" name="intent" value="confirm" loading={isPending} size="small">
            이 설정으로 등록
          </ActionButton>
        )}
      </div>

      {state.message && (
        <p style={{ color: state.ok ? "var(--seed-color-fg-positive)" : "var(--seed-color-fg-critical)" }}>
          {state.message}
        </p>
      )}

      {state.preview.length > 0 && (
        <ul style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, listStyle: "none", padding: 0 }}>
          {state.preview.map((a) => (
            <li
              key={a.url}
              style={{ border: "1px solid var(--seed-color-stroke-neutral)", borderRadius: 6, padding: 8 }}
            >
              <strong>{a.title}</strong>
              {a.excerpt && (
                <div style={{ color: "var(--seed-color-fg-neutral-muted)", marginTop: 4 }}>{a.excerpt}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
