-- Search every query term across title, excerpt, and tags instead of requiring
-- the complete query to appear as one contiguous substring. Common tech terms
-- are expanded to Korean/English aliases within each term group.
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
  with query_terms as (
    select distinct lower(trim(token)) as term
    from regexp_split_to_table(coalesce(search_query, ''), '[[:space:]]+') as split(token)
    where trim(token) <> ''
  ),
  query_groups as (
    select
      case
        when term in ('react', '리액트') then array['react', '리액트']::text[]
        when term in ('typescript', '타입스크립트') then array['typescript', '타입스크립트']::text[]
        when term in ('javascript', '자바스크립트') then array['javascript', '자바스크립트']::text[]
        when term in ('python', '파이썬') then array['python', '파이썬']::text[]
        when term in ('kubernetes', 'k8s', '쿠버네티스') then array['kubernetes', 'k8s', '쿠버네티스']::text[]
        when term in ('frontend', 'front-end', '프론트엔드') then array['frontend', 'front-end', '프론트엔드']::text[]
        when term in ('backend', 'back-end', '백엔드') then array['backend', 'back-end', '백엔드']::text[]
        when term in ('devops', '데브옵스') then array['devops', '데브옵스']::text[]
        when term in ('database', 'db', '데이터베이스') then array['database', 'db', '데이터베이스']::text[]
        when term in ('ai', '인공지능') then array['ai', '인공지능']::text[]
        when term in ('ml', 'machine-learning', '머신러닝') then array['ml', 'machine-learning', '머신러닝']::text[]
        when term in ('nextjs', 'next.js', '넥스트') then array['nextjs', 'next.js', '넥스트']::text[]
        when term in ('nodejs', 'node.js', '노드') then array['nodejs', 'node.js', '노드']::text[]
        when term in ('postgres', 'postgresql', '포스트그레스') then array['postgres', 'postgresql', '포스트그레스']::text[]
        when term in ('server', 'servers', '서버') then array['server', 'servers', '서버']::text[]
        when term in ('component', 'components', '컴포넌트') then array['component', 'components', '컴포넌트']::text[]
        else array[term]::text[]
      end as candidates
    from query_terms
  )
  select
    a.id,
    a.title,
    a.url,
    a.excerpt,
    a.thumbnail_url,
    a.published_at,
    a.click_count,
    a.category,
    a.tags,
    s.id,
    s.title,
    s.site_url,
    s.favicon_url
  from public.articles a
  join public.sources s on s.id = a.source_id
  where exists (select 1 from query_groups)
    and not exists (
      select 1
      from query_groups query_group
      where not exists (
        select 1
        from unnest(query_group.candidates) as candidate(value)
        where case
          -- Short Latin tokens such as AI, ML, and DB need word boundaries to avoid matching
          -- unrelated substrings like "mail" or "maintain" when trigram indexes cannot help.
          when candidate.value ~ '^[a-z0-9]{1,2}$' then
            a.title ~* ('(^|[^a-z0-9])' || candidate.value || '([^a-z0-9]|$)')
            or coalesce(a.excerpt, '') ~* ('(^|[^a-z0-9])' || candidate.value || '([^a-z0-9]|$)')
            or exists (
              select 1
              from unnest(coalesce(a.tags, '{}'::text[])) as article_tag(value)
              where article_tag.value ~* ('(^|[^a-z0-9])' || candidate.value || '([^a-z0-9]|$)')
            )
          else
            a.title ilike '%' || replace(replace(replace(candidate.value, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
            or coalesce(a.excerpt, '') ilike '%' || replace(replace(replace(candidate.value, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
            or exists (
              select 1
              from unnest(coalesce(a.tags, '{}'::text[])) as article_tag(value)
              where article_tag.value ilike '%' || replace(replace(replace(candidate.value, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
            )
        end
      )
    )
  order by a.published_at desc nulls last
  limit 200;
$$;
