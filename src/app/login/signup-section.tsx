"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { signUpAction } from "./actions";

// 로그인 화면에서는 버튼만 보여주고, 회원가입 경로로 직접 들어온 경우에는 폼을 바로 펼친다.
export function SignUpSection({ next, initiallyOpen = false }: { next: string; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);

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
