import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Text } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { GoogleIcon } from "@/components/google-icon";
import { safeNextPath } from "@/lib/safe-next-path";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { signInWithPasswordAction, signInWithProviderAction } from "./actions";
import { SignUpSection } from "./signup-section";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; intent?: string }>;
}) {
  const { next, error, intent } = await searchParams;
  const redirectTo = safeNextPath(next);
  const isSignupIntent = intent === "signup";
  const signupParams = new URLSearchParams({ intent: "signup" });
  if (next) signupParams.set("next", redirectTo);
  const signupHref = `/login?${signupParams}`;
  const loginHref = next ? `/login?next=${encodeURIComponent(redirectTo)}` : "/login";

  const user = await getCurrentUser();
  if (user) redirect(redirectTo);

  return (
    <main className="auth-page">
      <Text as="h1" textStyle="t7Bold" color="fg.neutral">
        {isSignupIntent ? "회원가입" : "로그인"}
      </Text>

      {isSignupIntent ? (
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          계정을 만들면 읽음 표시와 즐겨찾기를 저장하고, 다른 기기에서도 이어서 볼 수 있어요.
        </Text>
      ) : (
        <Link href={signupHref} className="auth-signup-prompt">
          처음 오셨나요? <strong>무료 회원가입</strong>
        </Link>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <form action={signInWithProviderAction.bind(null, "google", redirectTo)}>
          <ActionButton
            type="submit"
            variant="neutralOutline"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <GoogleIcon />
            {isSignupIntent ? "Google로 시작하기" : "Google로 계속하기"}
          </ActionButton>
        </form>
      </div>

      {isSignupIntent ? (
        <>
          <div className="auth-divider-label"><span>또는 이메일로 가입</span></div>
          <SignUpSection next={redirectTo} initiallyOpen />
          <Link href={loginHref} className="auth-existing-account-link">
            이미 계정이 있나요? 로그인
          </Link>
        </>
      ) : (
        <>
          <div style={{ borderTop: "1px solid var(--seed-color-stroke-neutral-subtle)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Text as="h2" textStyle="t4Bold" color="fg.neutral">
              이메일로 로그인
            </Text>
            <form action={signInWithPasswordAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input type="hidden" name="next" value={redirectTo} />
              <TextField name="email" label="이메일">
                <TextFieldInput type="email" placeholder="you@example.com" required />
              </TextField>
              <TextField name="password" label="비밀번호">
                <TextFieldInput type="password" required minLength={6} />
              </TextField>
              <ActionButton type="submit" size="small">
                로그인
              </ActionButton>
            </form>
          </div>
        </>
      )}

      {error && (
        <Text as="p" textStyle="t3Regular" color="fg.critical">
          {error}
        </Text>
      )}
    </main>
  );
}
