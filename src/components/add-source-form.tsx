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
  // 실패한 시도가 이미 선택자를 갖고 있다면(예: 자동 인식은 됐지만 결과가 0건) 바로 펼쳐서 보여준다.
  const [advancedOpen, setAdvancedOpen] = useState(() => !!state.scrapeConfig);

  // 자동으로 글을 찾은 경우: 선택자 입력창은 아예 보여주지 않고, 값은 숨겨진 필드로만 다음 요청에 실어 보낸다.
  const autoWorked = state.step === "previewed" && state.feedType === "scrape" && state.preview.length > 0;
  // 자동 인식이 실패했을 때만 "직접 지정하기"를 제안한다.
  const needsManualSetup = state.step === "previewed" && state.feedType === "scrape" && state.preview.length === 0;
  const showConfirmButton = state.step === "previewed" && state.preview.length > 0;

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
      <TextField name="siteUrl" label="블로그 홈 URL">
        <TextFieldInput type="url" placeholder="https://example.com" required defaultValue={state.siteUrl} />
      </TextField>

      {autoWorked && (
        <>
          <input type="hidden" name="listItemSelector" value={state.scrapeConfig?.listItemSelector ?? ""} />
          <input type="hidden" name="titleSelector" value={state.scrapeConfig?.titleSelector ?? ""} />
          <input type="hidden" name="linkSelector" value={state.scrapeConfig?.linkSelector ?? ""} />
          <input type="hidden" name="excerptSelector" value={state.scrapeConfig?.excerptSelector ?? ""} />
          <input type="hidden" name="dateSelector" value={state.scrapeConfig?.dateSelector ?? ""} />
          <input type="hidden" name="thumbnailSelector" value={state.scrapeConfig?.thumbnailSelector ?? ""} />
        </>
      )}

      {needsManualSetup && (
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
          {!advancedOpen ? (
            <ActionButton
              type="button"
              variant="neutralOutline"
              size="small"
              onClick={() => setAdvancedOpen(true)}
              style={{ alignSelf: "flex-start" }}
            >
              직접 지정하기
            </ActionButton>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "var(--seed-color-fg-neutral-muted)", margin: 0 }}>
                이 사이트의 글 목록이 어떻게 생겼는지 알려주면 그대로 가져올게요.
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
                <TextFieldInput
                  placeholder="예: img"
                  defaultValue={state.scrapeConfig?.thumbnailSelector ?? ""}
                />
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
          확인
        </ActionButton>
        {showConfirmButton && (
          <ActionButton type="submit" name="intent" value="confirm" loading={isPending} size="small">
            등록
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
