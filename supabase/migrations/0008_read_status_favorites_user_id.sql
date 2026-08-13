-- 로그인 계정이 생겼으니(Supabase Auth) 읽음/즐겨찾기를 익명 방문자 쿠키(visitor_id) 대신
-- 로그인 계정(user_id) 기준으로 전환한다. visitor_id는 과거 데이터 이전(migrateVisitorDataToUser)을
-- 위해 당분간 컬럼은 남겨두되, 더 이상 필수가 아니므로 nullable로 바꾸고 PK에서 뺀다.
-- PK 컬럼은 nullable일 수 없어(Postgres 제약) 대리키(id)를 새로 두고, 실제 유일성은
-- (visitor_id, article_id) / (user_id, article_id) 각각에 대한 부분 유니크 인덱스로 보장한다.

alter table public.read_status
  add column id uuid not null default gen_random_uuid(),
  add column user_id uuid references auth.users(id) on delete cascade;

alter table public.read_status drop constraint read_status_pkey;
alter table public.read_status alter column visitor_id drop not null;
alter table public.read_status add constraint read_status_pkey primary key (id);

create unique index read_status_visitor_article_key on public.read_status (visitor_id, article_id)
  where visitor_id is not null;
create unique index read_status_user_article_key on public.read_status (user_id, article_id)
  where user_id is not null;

alter table public.favorites
  add column id uuid not null default gen_random_uuid(),
  add column user_id uuid references auth.users(id) on delete cascade;

alter table public.favorites drop constraint favorites_pkey;
alter table public.favorites alter column visitor_id drop not null;
alter table public.favorites add constraint favorites_pkey primary key (id);

create unique index favorites_visitor_article_key on public.favorites (visitor_id, article_id)
  where visitor_id is not null;
create unique index favorites_user_article_key on public.favorites (user_id, article_id)
  where user_id is not null;
