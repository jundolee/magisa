-- 같은 글이 서로 다른 소스(예: 원본 블로그 RSS + 다른 큐레이션 사이트)에서
-- 중복으로 수집되는 것을 막기 위한 전역 URL 유니크 제약.
-- 기존 unique(source_id, dedup_key)는 같은 소스 내 재수집 시 중복 방지용으로 그대로 유지한다.

alter table public.articles add column if not exists canonical_url text;

update public.articles set canonical_url = url where canonical_url is null;

alter table public.articles alter column canonical_url set not null;

alter table public.articles
  add constraint articles_canonical_url_key unique (canonical_url);
