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
      <div className="auth-heading">
        <Text as="h1" textStyle="t9Bold" color="fg.neutral">
          {isSignupIntent ? "회원가입" : "로그인"}
        </Text>

        {isSignupIntent ? (
          <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
            계정을 만들면 읽음 표시와 즐겨찾기를 저장하고, 다른 기기에서도 이어서 볼 수 있어요.
          </Text>
        ) : null}
      </div>

      {error && (
        <Text as="p" role="alert" textStyle="t3Regular" color="fg.critical">
          {error}
        </Text>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <form action={signInWithProviderAction.bind(null, "google", redirectTo)}>
          <ActionButton
            type="submit"
            size="medium"
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
          <div className="auth-email-section">
            <div className="auth-divider-label"><span>또는</span></div>
            <Text as="h2" textStyle="t6Bold" color="fg.neutral">
              이메일로 가입
            </Text>
            <SignUpSection next={redirectTo} initiallyOpen />
          </div>
          <Link href={loginHref} className="auth-account-switch-link">
            이미 계정이 있나요? 로그인
          </Link>
        </>
      ) : (
        <>
          <div className="auth-email-section">
            <div className="auth-divider-label"><span>또는</span></div>
            <Text as="h2" textStyle="t6Bold" color="fg.neutral">
              이메일로 로그인
            </Text>
            <form action={signInWithPasswordAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input type="hidden" name="next" value={redirectTo} />
              <TextField name="email" label="이메일">
                <TextFieldInput type="email" autoComplete="email" placeholder="you@example.com" required />
              </TextField>
              <TextField name="password" label="비밀번호">
                <TextFieldInput type="password" autoComplete="current-password" required minLength={6} />
              </TextField>
              <ActionButton type="submit" size="medium">
                로그인
              </ActionButton>
            </form>
          </div>
          <Link href={signupHref} className="auth-account-switch-link">
            처음 오셨나요? 무료 회원가입
          </Link>
        </>
      )}
    </main>
  );
}
