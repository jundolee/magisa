"use client";

import { useActionState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { addSourceFlowAction, type AddSourceFlowState } from "@/app/sources/actions";

const initialState: AddSourceFlowState = {
  ok: true,
  message: "",
  step: "idle",
  siteUrl: "",
  feedType: "unknown",
  feedUrl: null,
  scrapeConfigJson: "",
  preview: [],
};

export function AddSourceForm() {
  const [state, formAction, isPending] = useActionState(addSourceFlowAction, initialState);

  const showScrapeConfigEditor = state.step === "previewed" && state.feedType === "scrape";
  const showConfirmButton = state.step === "previewed" && state.preview.length > 0;

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
      <TextField name="siteUrl" label="블로그 홈 URL">
        <TextFieldInput type="url" placeholder="https://example.com" required defaultValue={state.siteUrl} />
      </TextField>

      {showScrapeConfigEditor && (
        <TextField name="scrapeConfigJson" label="스크래핑 설정 (자동 추론됨 — 결과가 이상하면 수정 후 다시 미리보기)">
          <TextFieldTextarea
            style={{ minHeight: 140, fontFamily: "monospace", fontSize: 13 }}
            defaultValue={state.scrapeConfigJson}
          />
        </TextField>
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
