-- 글 클릭수(모든 방문자 공통, 전역 카운터) 추가.
-- 읽음/안읽음과 달리 방문자별로 나눌 필요가 없어 articles 테이블에 그대로 컬럼으로 둔다.

alter table public.articles add column if not exists click_count integer not null default 0;

-- 동시 클릭에도 안전하게 증가시키기 위해 RPC 함수로 원자적 UPDATE를 감싼다
-- (supabase-js는 "column + 1" 같은 산술 업데이트를 직접 지원하지 않음).
create or replace function public.increment_article_click_count(target_id uuid)
returns void
language sql
as $$
  update public.articles set click_count = click_count + 1 where id = target_id;
$$;
