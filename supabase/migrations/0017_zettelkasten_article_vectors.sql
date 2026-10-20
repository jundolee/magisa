-- Private Zettelkasten notes and explicit relationships.
create table if not exists public.zettel_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists zettel_notes_user_updated_idx
  on public.zettel_notes (user_id, updated_at desc);

create table if not exists public.zettel_note_articles (
  user_id uuid not null,
  note_id uuid not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  relation text not null default 'inspiration'
    check (relation in ('inspiration', 'evidence', 'counterexample', 'example', 'background')),
  created_at timestamptz not null default now(),
  primary key (user_id, note_id, article_id),
  foreign key (note_id, user_id) references public.zettel_notes(id, user_id) on delete cascade
);

create index if not exists zettel_note_articles_user_article_idx
  on public.zettel_note_articles (user_id, article_id);

create or replace function public.create_zettel_note_from_article(
  note_user_id uuid,
  source_article_id uuid,
  note_title text,
  note_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_note_id uuid;
begin
  if note_title is null or char_length(note_title) not between 1 and 180 then
    raise exception 'Note title must contain 1 to 180 characters';
  end if;
  if note_body is null or char_length(note_body) not between 1 and 20000 then
    raise exception 'Note body must contain 1 to 20000 characters';
  end if;

  insert into public.zettel_notes (user_id, title, body)
  values (note_user_id, note_title, note_body)
  returning id into created_note_id;

  insert into public.zettel_note_articles (user_id, note_id, article_id, relation)
  values (note_user_id, created_note_id, source_article_id, 'inspiration');

  return created_note_id;
end;
$$;

create table if not exists public.zettel_note_links (
  user_id uuid not null,
  from_note_id uuid not null,
  to_note_id uuid not null,
  relation text not null
    check (relation in ('extends', 'supports', 'contradicts', 'example_of', 'depends_on', 'related')),
  rationale text not null default '' check (char_length(rationale) <= 600),
  created_at timestamptz not null default now(),
  primary key (user_id, from_note_id, to_note_id),
  check (from_note_id <> to_note_id),
  foreign key (from_note_id, user_id) references public.zettel_notes(id, user_id) on delete cascade,
  foreign key (to_note_id, user_id) references public.zettel_notes(id, user_id) on delete cascade
);

create index if not exists zettel_note_links_user_to_idx
  on public.zettel_note_links (user_id, to_note_id);

-- Article vectors are an external retrieval index. This table is the durable outbox and
-- records whether each article is pending, indexed, or needs retrying.
create table if not exists public.article_embedding_jobs (
  article_id uuid primary key references public.articles(id) on delete cascade,
  content_hash text not null,
  model text not null default 'multilingual-e5-large',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'indexed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  indexed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists article_embedding_jobs_ready_idx
  on public.article_embedding_jobs (next_attempt_at, created_at)
  where status in ('pending', 'failed');

-- Cached nearest-neighbor candidates keep Pinecone reads out of public page requests.
-- These are suggestions only; user-confirmed knowledge links live in zettel_note_links.
create table if not exists public.article_related_candidates (
  article_id uuid not null references public.articles(id) on delete cascade,
  related_article_id uuid not null references public.articles(id) on delete cascade,
  article_content_hash text not null,
  related_content_hash text not null,
  score double precision not null,
  model text not null default 'multilingual-e5-large',
  updated_at timestamptz not null default now(),
  primary key (article_id, related_article_id),
  check (article_id <> related_article_id)
);

create index if not exists article_related_candidates_ranked_idx
  on public.article_related_candidates (article_id, score desc);

create or replace function public.get_article_related_candidates(
  requested_article_id uuid,
  requested_limit integer default 5
)
returns table (
  article_status text,
  related_article_id uuid,
  score double precision,
  title text,
  url text,
  excerpt text,
  published_at timestamptz,
  category text,
  tags text[],
  source_id uuid,
  source_title text,
  source_site_url text,
  source_favicon_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    current_job.status,
    candidate.related_article_id,
    candidate.score,
    related_article.title,
    related_article.url,
    related_article.excerpt,
    related_article.published_at,
    related_article.category,
    related_article.tags,
    related_source.id,
    related_source.title,
    related_source.site_url,
    related_source.favicon_url
  from public.article_embedding_jobs as current_job
  left join lateral (
    select candidate_rows.related_article_id, candidate_rows.score
    from public.article_related_candidates as candidate_rows
    join public.article_embedding_jobs as target_job
      on target_job.article_id = candidate_rows.related_article_id
     and target_job.status = 'indexed'
     and target_job.content_hash = candidate_rows.related_content_hash
     and target_job.model = candidate_rows.model
    join public.articles as candidate_article
      on candidate_article.id = candidate_rows.related_article_id
    join public.sources as candidate_source
      on candidate_source.id = candidate_article.source_id
     and candidate_source.is_active = true
    where candidate_rows.article_id = current_job.article_id
      and candidate_rows.article_content_hash = current_job.content_hash
      and candidate_rows.model = current_job.model
    order by candidate_rows.score desc
    limit least(greatest(coalesce(requested_limit, 5), 1), 10)
  ) as candidate on true
  left join public.articles as related_article on related_article.id = candidate.related_article_id
  left join public.sources as related_source
    on related_source.id = related_article.source_id
   and related_source.is_active = true
  where current_job.article_id = requested_article_id
  order by candidate.score desc nulls last;
$$;

-- Deletion tombstones intentionally have no article FK: they must survive article/source deletion
-- long enough to remove the corresponding Pinecone vector.
create table if not exists public.article_embedding_deletions (
  article_id uuid primary key,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists article_embedding_deletions_ready_idx
  on public.article_embedding_deletions (next_attempt_at, created_at)
  where status in ('pending', 'failed');

create or replace function public.queue_article_embedding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_hash text;
  previous_hash text;
begin
  next_hash := md5(concat_ws(
    E'\n',
    new.title,
    coalesce(new.excerpt, ''),
    coalesce(new.category, 'general'),
    array_to_string(coalesce(new.tags, '{}'::text[]), ',')
  ));

  if tg_op = 'UPDATE' then
    previous_hash := md5(concat_ws(
      E'\n',
      old.title,
      coalesce(old.excerpt, ''),
      coalesce(old.category, 'general'),
      array_to_string(coalesce(old.tags, '{}'::text[]), ',')
    ));
  end if;

  if tg_op = 'INSERT' or previous_hash <> next_hash then
    delete from public.article_related_candidates
    where article_id = new.id or related_article_id = new.id;
  end if;

  insert into public.article_embedding_jobs (article_id, content_hash, model, status)
  values (new.id, next_hash, 'multilingual-e5-large', 'pending')
  on conflict (article_id) do update
  set content_hash = excluded.content_hash,
      model = excluded.model,
      status = 'pending',
      attempts = 0,
      next_attempt_at = now(),
      locked_at = null,
      indexed_at = null,
      last_error = null,
      updated_at = now()
  where public.article_embedding_jobs.content_hash <> excluded.content_hash
     or public.article_embedding_jobs.model <> excluded.model;

  return new;
end;
$$;

drop trigger if exists articles_queue_embedding on public.articles;
create trigger articles_queue_embedding
after insert or update of title, excerpt, category, tags on public.articles
for each row execute function public.queue_article_embedding();

create or replace function public.queue_article_embedding_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.article_embedding_deletions (article_id)
  values (old.id)
  on conflict (article_id) do update
    set status = 'pending', attempts = 0, next_attempt_at = now(), locked_at = null,
        last_error = null, updated_at = now();
  return old;
end;
$$;

drop trigger if exists articles_queue_embedding_deletion on public.articles;
create trigger articles_queue_embedding_deletion
before delete on public.articles
for each row execute function public.queue_article_embedding_deletion();

-- First-deployment backfill. New articles and relevant metadata edits are covered by the trigger.
insert into public.article_embedding_jobs (article_id, content_hash, model, status)
select
  a.id,
  md5(concat_ws(
    E'\n',
    a.title,
    coalesce(a.excerpt, ''),
    coalesce(a.category, 'general'),
    array_to_string(coalesce(a.tags, '{}'::text[]), ',')
  )),
  'multilingual-e5-large',
  'pending'
from public.articles as a
on conflict (article_id) do nothing;

create or replace function public.claim_article_embedding_jobs(requested_limit integer default 32)
returns table (
  article_id uuid,
  title text,
  excerpt text,
  category text,
  tags text[],
  source_id uuid,
  content_hash text,
  attempts integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Recover locks left by a timed-out function invocation.
  update public.article_embedding_jobs as j
  set status = case when j.attempts >= 8 then 'failed' else 'pending' end,
      locked_at = null,
      next_attempt_at = now(),
      last_error = coalesce(j.last_error, 'Recovered an expired processing lock'),
      updated_at = now()
  where j.status = 'processing'
    and j.locked_at < now() - interval '10 minutes';

  return query
  with candidates as (
    select j.article_id
    from public.article_embedding_jobs as j
    where j.status = 'pending'
      and j.attempts < 8
      and j.next_attempt_at <= now()
    order by j.next_attempt_at asc, j.created_at asc
    limit least(greatest(coalesce(requested_limit, 32), 1), 200)
    for update skip locked
  ), claimed as (
    update public.article_embedding_jobs as j
    set status = 'processing',
        locked_at = now(),
        attempts = j.attempts + 1,
        updated_at = now()
    from candidates as c
    where j.article_id = c.article_id
    returning j.article_id, j.content_hash, j.attempts
  )
  select a.id, a.title, a.excerpt, coalesce(a.category, 'general'),
         coalesce(a.tags, '{}'::text[]), a.source_id, claimed.content_hash, claimed.attempts
  from claimed
  join public.articles as a on a.id = claimed.article_id
  order by a.discovered_at asc;
end;
$$;

create or replace function public.complete_article_embedding_jobs(results jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  changed integer := 0;
begin
  if jsonb_typeof(results) <> 'array' then
    raise exception 'results must be a JSON array';
  end if;

  for item in
    select *
    from jsonb_to_recordset(results) as x(article_id uuid, content_hash text, ok boolean, error text)
  loop
    if item.ok then
      update public.article_embedding_jobs as j
      set status = 'indexed', locked_at = null, indexed_at = now(), last_error = null,
          next_attempt_at = now(), updated_at = now()
      where j.article_id = item.article_id
        and j.content_hash = item.content_hash
        and j.status = 'processing';
    else
      update public.article_embedding_jobs as j
      set status = case when j.attempts >= 8 then 'failed' else 'pending' end,
          locked_at = null,
          next_attempt_at = now() + interval '30 minutes',
          last_error = left(coalesce(item.error, 'Embedding indexing failed'), 600),
          updated_at = now()
      where j.article_id = item.article_id
        and j.content_hash = item.content_hash
        and j.status = 'processing';
    end if;
    changed := changed + case when found then 1 else 0 end;
  end loop;

  return changed;
end;
$$;

create or replace function public.claim_article_embedding_deletions(requested_limit integer default 100)
returns table (article_id uuid, attempts integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.article_embedding_deletions as d
  set status = case when d.attempts >= 8 then 'failed' else 'pending' end,
      locked_at = null,
      next_attempt_at = now(),
      last_error = coalesce(d.last_error, 'Recovered an expired processing lock'),
      updated_at = now()
  where d.status = 'processing'
    and d.locked_at < now() - interval '10 minutes';

  return query
  with candidates as (
    select d.article_id
    from public.article_embedding_deletions as d
    where d.status = 'pending'
      and d.attempts < 8
      and d.next_attempt_at <= now()
    order by d.next_attempt_at asc, d.created_at asc
    limit least(greatest(coalesce(requested_limit, 100), 1), 500)
    for update skip locked
  ), claimed as (
    update public.article_embedding_deletions as d
    set status = 'processing', locked_at = now(), attempts = d.attempts + 1, updated_at = now()
    from candidates as c
    where d.article_id = c.article_id
    returning d.article_id, d.attempts
  )
  select claimed.article_id, claimed.attempts from claimed;
end;
$$;

create or replace function public.complete_article_embedding_deletions(
  article_ids uuid[],
  succeeded boolean,
  error_message text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if succeeded then
    delete from public.article_embedding_deletions as d
    where d.article_id = any(coalesce(article_ids, '{}'::uuid[]))
      and d.status = 'processing';
    get diagnostics changed = row_count;
  else
    update public.article_embedding_deletions as d
    set status = case when d.attempts >= 8 then 'failed' else 'pending' end,
        locked_at = null,
        next_attempt_at = now() + interval '30 minutes',
        last_error = left(coalesce(error_message, 'Vector deletion failed'), 600),
        updated_at = now()
    where d.article_id = any(coalesce(article_ids, '{}'::uuid[]))
      and d.status = 'processing';
    get diagnostics changed = row_count;
  end if;

  return changed;
end;
$$;

-- All reads and writes for these server-managed tables go through the server-only service-role DAL.
alter table public.zettel_notes enable row level security;
alter table public.zettel_note_articles enable row level security;
alter table public.zettel_note_links enable row level security;
alter table public.article_embedding_jobs enable row level security;
alter table public.article_embedding_deletions enable row level security;
alter table public.article_related_candidates enable row level security;

revoke all on public.zettel_notes, public.zettel_note_articles, public.zettel_note_links,
  public.article_embedding_jobs, public.article_embedding_deletions from public, anon, authenticated;
revoke all on public.article_related_candidates from public, anon, authenticated;
grant all on public.zettel_notes, public.zettel_note_articles, public.zettel_note_links,
  public.article_embedding_jobs, public.article_embedding_deletions to service_role;
grant all on public.article_related_candidates to service_role;

revoke all on function public.queue_article_embedding() from public, anon, authenticated;
revoke all on function public.queue_article_embedding_deletion() from public, anon, authenticated;
revoke all on function public.create_zettel_note_from_article(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_article_related_candidates(uuid, integer) from public, anon, authenticated;
revoke all on function public.claim_article_embedding_jobs(integer) from public, anon, authenticated;
revoke all on function public.complete_article_embedding_jobs(jsonb) from public, anon, authenticated;
revoke all on function public.claim_article_embedding_deletions(integer) from public, anon, authenticated;
revoke all on function public.complete_article_embedding_deletions(uuid[], boolean, text) from public, anon, authenticated;

grant execute on function public.claim_article_embedding_jobs(integer) to service_role;
grant execute on function public.create_zettel_note_from_article(uuid, uuid, text, text) to service_role;
grant execute on function public.get_article_related_candidates(uuid, integer) to service_role;
grant execute on function public.complete_article_embedding_jobs(jsonb) to service_role;
grant execute on function public.claim_article_embedding_deletions(integer) to service_role;
grant execute on function public.complete_article_embedding_deletions(uuid[], boolean, text) to service_role;
