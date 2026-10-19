-- Keep public indexes complete without fetching a fallback query per source.
create index if not exists articles_source_published_discovered_idx
  on public.articles (source_id, published_at desc nulls last, discovered_at desc nulls last);

create index if not exists articles_category_published_discovered_idx
  on public.articles (category, published_at desc nulls last, discovered_at desc nulls last);

create or replace function public.get_public_blog_index()
returns table (
  source_id uuid,
  latest_article_title text,
  has_articles boolean,
  last_modified timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id as source_id,
    latest.title as latest_article_title,
    latest.article_id is not null as has_articles,
    recent.last_modified
  from public.sources as s
  left join lateral (
    select a.id as article_id, a.title
    from public.articles as a
    where a.source_id = s.id
    order by a.published_at desc nulls last, a.discovered_at desc nulls last
    limit 1
  ) as latest on true
  left join lateral (
    select max(coalesce(visible.discovered_at, visible.published_at)) as last_modified
    from (
      select a.discovered_at, a.published_at
      from public.articles as a
      where a.source_id = s.id
      order by a.published_at desc nulls last, a.discovered_at desc nulls last
      limit 20
    ) as visible
  ) as recent on true
  where s.is_active = true;
$$;

-- Topic landing pages draw from the archive, not only the 200-item home feed.
create or replace function public.get_public_category_articles(category_id text, requested_limit integer default 20)
returns table (
  id uuid,
  title text,
  url text,
  excerpt text,
  published_at timestamptz,
  discovered_at timestamptz,
  category text,
  source_id uuid,
  source_title text,
  source_site_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.title,
    a.url,
    a.excerpt,
    a.published_at,
    a.discovered_at,
    a.category,
    s.id as source_id,
    s.title as source_title,
    s.site_url as source_site_url
  from public.articles as a
  join public.sources as s on s.id = a.source_id and s.is_active = true
  where a.category = category_id
  order by a.published_at desc nulls last, a.discovered_at desc nulls last
  limit least(greatest(coalesce(requested_limit, 20), 1), 50);
$$;

-- Report only topics that have indexable article content. Last modification is
-- calculated from the same 20 visible rows used by each topic landing page.
create or replace function public.get_public_category_index()
returns table (
  category_id text,
  article_count bigint,
  last_modified timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with active_articles as (
    select
      a.category,
      a.published_at,
      a.discovered_at
    from public.articles as a
    join public.sources as s on s.id = a.source_id and s.is_active = true
    where a.category in ('frontend', 'backend', 'ai_ml', 'devops', 'mobile', 'data', 'culture', 'general')
  ),
  visible_articles as (
    select
      active_articles.category,
      active_articles.published_at,
      active_articles.discovered_at,
      row_number() over (
        partition by active_articles.category
        order by active_articles.published_at desc nulls last, active_articles.discovered_at desc nulls last
      ) as visible_rank
    from active_articles
  ),
  category_counts as (
    select active_articles.category, count(*) as article_count
    from active_articles
    group by active_articles.category
  ),
  visible_dates as (
    select
      visible_articles.category,
      max(coalesce(visible_articles.discovered_at, visible_articles.published_at)) as last_modified
    from visible_articles
    where visible_articles.visible_rank <= 20
    group by visible_articles.category
  )
  select
    category_counts.category as category_id,
    category_counts.article_count,
    visible_dates.last_modified
  from category_counts
  join visible_dates on visible_dates.category = category_counts.category;
$$;

revoke all on function public.get_public_blog_index() from public, anon, authenticated;
revoke all on function public.get_public_category_articles(text, integer) from public, anon, authenticated;
revoke all on function public.get_public_category_index() from public, anon, authenticated;
grant execute on function public.get_public_blog_index() to service_role;
grant execute on function public.get_public_category_articles(text, integer) to service_role;
grant execute on function public.get_public_category_index() to service_role;
