-- Keep the future full-article worker scoped to its prompt version.
-- Existing excerpt-summary jobs and their states are not claimed or updated by this RPC.
create or replace function public.claim_article_summary_jobs_by_version(
  p_prompt_version text,
  p_limit integer default 8
)
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
  where prompt_version = p_prompt_version
    and status = 'processing'
    and lease_until < now()
    and attempt_count >= 3;

  return query
  with candidates as (
    select article_id, prompt_version
    from public.article_summary_jobs
    where prompt_version = p_prompt_version
      and (
        status = 'pending'
        or (status = 'processing' and lease_until < now() and attempt_count < 3)
        or (status = 'failed' and attempt_count < 3 and retry_after <= now())
      )
    order by coalesce(retry_after, created_at), created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 8), 8))
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

revoke all on function public.claim_article_summary_jobs_by_version(text, integer) from public, anon, authenticated;
grant execute on function public.claim_article_summary_jobs_by_version(text, integer) to service_role;
