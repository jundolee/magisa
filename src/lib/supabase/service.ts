import "server-only";
import { createClient } from "@supabase/supabase-js";

// 서버 사이드 전용 클라이언트 (service role 키 사용, RLS 우회).
// 클라이언트 컴포넌트에서 절대 import하지 않는다 — "server-only"가 실수로 그럴 경우 빌드 타임에 에러를 낸다.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다. .env.example을 참고해 .env.local을 만드세요."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
