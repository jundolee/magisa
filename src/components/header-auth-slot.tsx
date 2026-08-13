import { Suspense } from "react";
import Link from "next/link";
import { Text } from "@seed-design/react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { signOutAction } from "@/app/login/actions";

// PageHeader는 즉시 그려지고 이 부분만 스트리밍으로 채워지도록 별도 Suspense 경계로 분리했다 —
// getUser()가 Supabase Auth 서버를 왕복하는 동안 헤더 전체가 지연되지 않게 하기 위함
// (page.tsx의 ArticleListSection과 같은 패턴, docs/decisions.md 참고). getCurrentUser()는 요청
// 범위로 캐시돼 있어 ArticleListSection이 이미 같은 요청에서 호출했다면 왕복이 중복되지 않는다.
async function AuthSlotContent() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link href="/login">
        <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          로그인
        </Text>
      </Link>
    );
  }

  const nickname = user.user_metadata.nickname ?? user.user_metadata.full_name ?? user.user_metadata.name;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {nickname && (
        <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          {nickname}
        </Text>
      )}
      <form action={signOutAction}>
        <button type="submit" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
            로그아웃
          </Text>
        </button>
      </form>
    </div>
  );
}

export function HeaderAuthSlot() {
  return (
    <Suspense fallback={null}>
      <AuthSlotContent />
    </Suspense>
  );
}
