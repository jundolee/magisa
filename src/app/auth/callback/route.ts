import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// rss-parser/cheerio는 아니지만 next/headers의 cookies()를 통해 세션 쿠키를 직접 써야 해서
// Route Handler로 구현한다 (OAuth/매직링크 리다이렉트가 이 경로로 돌아온다).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("로그인에 실패했어요. 다시 시도해주세요.")}`);
}
