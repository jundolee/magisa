-- 읽음/안읽음을 전역 컬럼(articles.is_read) 대신 방문자(브라우저)별로 구분한다.
-- 로그인 없이 쿠키로 부여하는 익명 visitor_id 기준 (docs/decisions.md 참고).

create table if not exists public.read_status (
  visitor_id text not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (visitor_id, article_id)
);

create index if not exists read_status_article_id_idx on public.read_status (article_id);

alter table public.read_status enable row level security;

-- 기존에 전역으로 읽음 처리돼 있던 글들을 '__legacy__' 스냅샷으로 보존.
-- 이후 신규 방문자가 최초 쿠키를 받을 때 이 스냅샷을 자신의 읽음 상태로 복사해 온다(proxy.ts 참고) —
-- 즉 이 마이그레이션 이후 가장 먼저 사이트를 여는 사람(대개 운영자 본인)이 기존 읽음 기록을 그대로 이어받는다.
insert into public.read_status (visitor_id, article_id, read_at)
select '__legacy__', id, coalesce(read_at, now())
from public.articles
where is_read = true
on conflict (visitor_id, article_id) do nothing;

alter table public.articles drop column if exists is_read;
alter table public.articles drop column if exists read_at;
