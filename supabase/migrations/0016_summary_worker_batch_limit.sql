-- Increase the separate excerpt-summary worker's hard batch cap from 10 to 80.
-- Requests remain bounded by the 60-second Vercel function duration and 20-way concurrency.
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
    limit greatest(1, least(coalesce(p_limit, 2), 80))
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
