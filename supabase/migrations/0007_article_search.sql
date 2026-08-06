-- 글 제목/요약 전문검색 (docs/roadmap.md Phase 2+ 후보 항목).
-- 한글은 형태소 사전 없이 tsvector(simple/english config)로 토큰화하면 부분 일치 검색이 잘 안 되고
-- (예: "리액트18버전"이 한 토큰이라 "리액트"로 부분 검색이 안 됨), 이 앱의 제목은 한글/영어가 섞여 있어
-- pg_trgm 트라이그램 인덱스로 ILIKE 부분 문자열 검색을 가속하는 방식을 택함.
create extension if not exists pg_trgm;

create index if not exists articles_title_trgm_idx on public.articles using gin (title gin_trgm_ops);
create index if not exists articles_excerpt_trgm_idx on public.articles using gin (excerpt gin_trgm_ops);

-- PostgREST .or()/.ilike() 필터 문자열을 사용자 입력으로 직접 조립하면 검색어에 쉼표/괄호가 섞였을 때
-- 필터 구문 자체가 깨지거나 의도치 않은 조건이 섞일 수 있어, 검색어를 평범한 함수 파라미터로 바인딩하는
-- RPC로 우회한다 (파라미터 바인딩이라 SQL 인젝션과 무관 — increment_article_click_count와 동일한 패턴).
-- ILIKE 와일드카드로 오인되지 않도록 검색어 안의 %, _, \ 는 리터럴로 이스케이프한다.
create or replace function public.search_articles(search_query text)
returns table (
  id uuid,
  title text,
  url text,
  excerpt text,
  thumbnail_url text,
  published_at timestamptz,
  click_count integer,
  source_id uuid,
  source_title text,
  source_site_url text,
  source_favicon_url text
)
language sql
stable
as $$
  with escaped as (
    select replace(replace(replace(search_query, '\', '\\'), '%', '\%'), '_', '\_') as pattern
  )
  select
    a.id, a.title, a.url, a.excerpt, a.thumbnail_url, a.published_at, a.click_count,
    s.id, s.title, s.site_url, s.favicon_url
  from public.articles a
  join public.sources s on s.id = a.source_id
  cross join escaped
  where a.title ilike '%' || escaped.pattern || '%'
     or a.excerpt ilike '%' || escaped.pattern || '%'
  order by a.published_at desc nulls last
  limit 200;
$$;
