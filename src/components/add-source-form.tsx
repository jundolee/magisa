"use client";

import { useActionState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { addSourceAction, type AddSourceActionState } from "@/app/sources/actions";

const initialState: AddSourceActionState = { ok: true, message: "" };

export function AddSourceForm() {
  const [state, formAction, isPending] = useActionState(addSourceAction, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      <TextField name="siteUrl" label="블로그 홈 URL">
        <TextFieldInput type="url" placeholder="https://example.com" required />
      </TextField>
      <TextField name="scrapeConfig" label="스크래핑 설정 (JSON, RSS를 못 찾았을 때만 입력)">
        <TextFieldTextarea
          style={{ minHeight: 96 }}
          placeholder='{"listItemSelector": ".post", "titleSelector": ".title", "linkSelector": "a"}'
        />
      </TextField>
      <ActionButton type="submit" loading={isPending} size="small">
        등록
      </ActionButton>
      {state.message && (
        <p style={{ color: state.ok ? "var(--seed-color-fg-positive)" : "var(--seed-color-fg-critical)" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
