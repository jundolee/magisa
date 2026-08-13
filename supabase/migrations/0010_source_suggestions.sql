-- 방문자가 /sources 관리자 권한 없이도 "이 블로그도 추가해주세요"를 제안할 수 있는 창구.
-- docs/growth-strategy.md 참고 — 소스 등록 자체는 계속 관리자 전용으로 남기고, 제안만 공개로 받는다.

create table if not exists public.source_suggestions (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- 다른 테이블과 동일한 패턴: RLS만 켜두고 정책은 만들지 않음 = service_role(서버 사이드)만 접근 가능.
-- 공개 제안 폼도 서버 액션(서비스 롤)을 통해서만 insert하므로 별도 anon insert 정책은 필요 없다.
alter table public.source_suggestions enable row level security;
