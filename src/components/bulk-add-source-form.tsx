"use client";

import { useActionState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldTextarea } from "seed-design/ui/text-field";
import { addSourcesBulkAction, type BulkAddActionState } from "@/app/sources/actions";

const initialState: BulkAddActionState = { total: 0, succeeded: 0, failed: [] };

export function BulkAddSourceForm() {
  const [state, formAction, isPending] = useActionState(addSourcesBulkAction, initialState);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      <TextField name="urls" label="사이트 주소 목록 (한 줄에 하나씩)">
        <TextFieldTextarea
          style={{ minHeight: 140 }}
          placeholder={"https://a.com\nhttps://b.com\nhttps://c.com"}
        />
      </TextField>
      <ActionButton type="submit" loading={isPending} size="small">
        일괄 등록
      </ActionButton>
      {state.total > 0 && (
        <div style={{ fontSize: 14 }}>
          <p>
            {state.succeeded}/{state.total}개 등록 성공
          </p>
          {state.failed.length > 0 && (
            <ul style={{ color: "var(--seed-color-fg-critical)" }}>
              {state.failed.map((f) => (
                <li key={f.siteUrl}>
                  {f.siteUrl}: {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
