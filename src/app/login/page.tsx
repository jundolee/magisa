import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { GoogleIcon } from "@/components/google-icon";
import { createClient } from "@/lib/supabase/server";
import { signInWithPasswordAction, signInWithProviderAction } from "./actions";
import { SignUpSection } from "./signup-section";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; signedUp?: string }>;
}) {
  const { next, error, signedUp } = await searchParams;
  const redirectTo = next ?? "/";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(redirectTo);

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <Text as="h1" textStyle="t7Bold" color="fg.neutral">
        로그인
      </Text>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <form action={signInWithProviderAction.bind(null, "google", redirectTo)}>
          <ActionButton
            type="submit"
            variant="neutralOutline"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <GoogleIcon />
            Google로 계속하기
          </ActionButton>
        </form>
      </div>

      <div style={{ borderTop: "1px solid var(--seed-color-stroke-neutral-subtle)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Text as="h2" textStyle="t4Bold" color="fg.neutral">
          이메일로 로그인
        </Text>
        <form action={signInWithPasswordAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="hidden" name="next" value={redirectTo} />
          <TextField name="email" label="이메일">
            <TextFieldInput type="email" placeholder="you@example.com" required autoFocus />
          </TextField>
          <TextField name="password" label="비밀번호">
            <TextFieldInput type="password" required minLength={6} />
          </TextField>
          <ActionButton type="submit" size="small">
            로그인
          </ActionButton>
        </form>
      </div>

      <div style={{ borderTop: "1px solid var(--seed-color-stroke-neutral-subtle)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Text as="h2" textStyle="t4Bold" color="fg.neutral">
          처음이신가요?
        </Text>
        <SignUpSection />
      </div>

      {signedUp && (
        <Text as="p" textStyle="t3Regular" color="fg.positive">
          가입 확인 메일을 보냈어요. 메일함에서 링크를 확인한 뒤 로그인해주세요.
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
