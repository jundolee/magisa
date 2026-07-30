import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { adminLoginAction } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main style={{ maxWidth: 360, margin: "120px auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <Text as="h1" textStyle="t7Bold" color="fg.neutral">
        관리자 로그인
      </Text>

      <form action={adminLoginAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="next" value={next ?? "/sources"} />
        <TextField name="password" label="비밀번호">
          <TextFieldInput type="password" required autoFocus />
        </TextField>
        <ActionButton type="submit" size="small">
          로그인
        </ActionButton>
      </form>

      {error && (
        <Text as="p" textStyle="t3Regular" color="fg.critical">
          비밀번호가 올바르지 않습니다.
        </Text>
      )}
    </main>
  );
}
