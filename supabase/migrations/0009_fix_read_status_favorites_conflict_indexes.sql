-- 0008에서 만든 부분 유니크 인덱스(where ... is not null)는 upsert의 ON CONFLICT (col1, col2)가
-- 인식하지 못한다 — Postgres가 ON CONFLICT 대상을 추론할 때 WHERE 절이 있는 인덱스는 제외하기 때문
-- (42P10 "there is no unique or exclusion constraint matching the ON CONFLICT specification").
-- 다행히 Postgres의 일반 유니크 인덱스는 NULL을 서로 다른 값으로 취급해 NULL끼리는 애초에 충돌하지
-- 않으므로, partial index가 없어도 user_id/visitor_id가 NULL인 행이 여러 개 있어도 문제없다 —
-- 그냥 일반 유니크 인덱스로 바꾼다.

drop index if exists public.read_status_visitor_article_key;
drop index if exists public.read_status_user_article_key;
create unique index read_status_visitor_article_key on public.read_status (visitor_id, article_id);
create unique index read_status_user_article_key on public.read_status (user_id, article_id);

drop index if exists public.favorites_visitor_article_key;
drop index if exists public.favorites_user_article_key;
create unique index favorites_visitor_article_key on public.favorites (visitor_id, article_id);
create unique index favorites_user_article_key on public.favorites (user_id, article_id);
