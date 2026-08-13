"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { signUpAction } from "./actions";

// 처음엔 버튼만 보여주고, 눌렀을 때만 입력 필드를 펼친다 — 로그인 화면에 처음부터 입력창 3개가
// 나란히 보이면 "이미 계정이 있는 사람"에게는 불필요한 정보라 화면이 번잡해 보임.
export function SignUpSection({ next }: { next: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <ActionButton type="button" variant="neutralOutline" size="small" onClick={() => setOpen(true)}>
        회원가입
      </ActionButton>
    );
  }

  return (
    <form action={signUpAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="next" value={next} />
      <TextField name="nickname" label="닉네임">
        <TextFieldInput type="text" required autoFocus />
      </TextField>
      <TextField name="email" label="이메일">
        <TextFieldInput type="email" placeholder="you@example.com" required />
      </TextField>
      <TextField name="password" label="비밀번호 (6자 이상)">
        <TextFieldInput type="password" required minLength={6} />
      </TextField>
      <TextField name="passwordConfirm" label="비밀번호 확인">
        <TextFieldInput type="password" required minLength={6} />
      </TextField>
      <ActionButton type="submit" variant="neutralOutline" size="small">
        회원가입
      </ActionButton>
    </form>
  );
}
