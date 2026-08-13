import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { migrateVisitorDataToUser } from "@/lib/data/articles";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor";

// rss-parser/cheerio는 아니지만 next/headers의 cookies()를 통해 세션 쿠키를 직접 써야 해서
// Route Handler로 구현한다 (OAuth/이메일 확인 리다이렉트가 이 경로로 돌아온다).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 로그인 전 익명 방문자 쿠키로 쌓아둔 읽음/즐겨찾기 기록을 최초 로그인 시 이 계정으로 옮긴다
      // (docs/decisions.md 참고).
      if (data.user) {
        const visitorId = (await cookies()).get(VISITOR_COOKIE_NAME)?.value;
        if (visitorId) await migrateVisitorDataToUser(visitorId, data.user.id);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("로그인에 실패했어요. 다시 시도해주세요.")}`);
}
