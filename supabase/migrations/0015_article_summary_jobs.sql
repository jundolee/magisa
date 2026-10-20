-- Durable, retryable summary jobs and cached summaries. Full article text is never stored here.
create table if not exists public.article_summary_jobs (
  article_id uuid not null references public.articles(id) on delete cascade,
  prompt_version text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'unavailable', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  lease_until timestamptz,
  retry_after timestamptz,
  extraction_status text check (extraction_status in ('supported', 'partial', 'blocked', 'insufficient', 'failed')),
  error_code text,
  lead text,
  key_points text[] not null default '{}',
  model text,
  input_sha256 text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  generated_at timestamptz,
  primary key (article_id, prompt_version),
  check (status <> 'ready' or (lead is not null and cardinality(key_points) between 2 and 3 and input_sha256 is not null))
);

create index if not exists article_summary_jobs_pending_idx
  on public.article_summary_jobs (status, retry_after, created_at);

alter table public.article_summary_jobs enable row level security;
revoke all on table public.article_summary_jobs from public, anon, authenticated;
grant select, insert, update on public.article_summary_jobs to service_role;

create or replace function public.claim_article_summary_jobs(p_limit integer default 2)
returns setof public.article_summary_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.article_summary_jobs
  set status = 'failed',
      error_code = 'lease_expired',
      lease_until = null,
      retry_after = null,
      updated_at = now()
  where status = 'processing' and lease_until < now() and attempt_count >= 3;

  return query
  with candidates as (
    select article_id, prompt_version
    from public.article_summary_jobs
    where (
      status = 'pending'
      or (status = 'processing' and lease_until < now() and attempt_count < 3)
      or (status = 'failed' and attempt_count < 3 and retry_after <= now())
    )
    order by coalesce(retry_after, created_at), created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 2), 10))
  )
  update public.article_summary_jobs as job
  set status = 'processing',
      attempt_count = job.attempt_count + 1,
      lease_until = now() + interval '3 minutes',
      retry_after = null,
      updated_at = now()
  from candidates
  where job.article_id = candidates.article_id
    and job.prompt_version = candidates.prompt_version
  returning job.*;
end;
$$;

revoke all on function public.claim_article_summary_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_article_summary_jobs(integer) to service_role;
