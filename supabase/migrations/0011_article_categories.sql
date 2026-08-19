-- articles 테이블에 category 및 tags 컬럼 추가
-- 표준 카테고리: 'frontend', 'backend', 'ai_ml', 'devops', 'mobile', 'data', 'culture', 'general'
alter table public.articles
  add column if not exists category text not null default 'general',
  add column if not exists tags text[] not null default '{}';

-- 카테고리 필터링 및 태그 검색을 위한 인덱스 생성
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_tags_idx on public.articles using gin (tags);

-- 전문검색 RPC search_articles 반환 테이블에 category, tags 추가
drop function if exists public.search_articles(text);

create or replace function public.search_articles(search_query text)
returns table (
  id uuid,
  title text,
  url text,
  excerpt text,
  thumbnail_url text,
  published_at timestamptz,
  click_count integer,
  category text,
  tags text[],
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
    a.category, a.tags,
    s.id, s.title, s.site_url, s.favicon_url
  from public.articles a
  join public.sources s on s.id = a.source_id
  cross join escaped
  where a.title ilike '%' || escaped.pattern || '%'
     or a.excerpt ilike '%' || escaped.pattern || '%'
  order by a.published_at desc nulls last
  limit 200;
$$;
