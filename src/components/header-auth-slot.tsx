import { Suspense } from "react";
import Link from "next/link";
import { Text } from "@seed-design/react";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";

// PageHeader는 즉시 그려지고 이 부분만 스트리밍으로 채워지도록 별도 Suspense 경계로 분리했다 —
// getUser()가 Supabase Auth 서버를 왕복하는 동안 헤더 전체가 지연되지 않게 하기 위함
// (page.tsx의 ArticleListSection과 같은 패턴, docs/decisions.md 참고).
async function AuthSlotContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href="/login">
        <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          로그인
        </Text>
      </Link>
    );
  }

  return (
    <form action={signOutAction} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
        {user.email}
      </Text>
      <button type="submit" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          로그아웃
        </Text>
      </button>
    </form>
  );
}

export function HeaderAuthSlot() {
  return (
    <Suspense fallback={null}>
      <AuthSlotContent />
    </Suspense>
  );
}
