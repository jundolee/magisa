-- Mark an account's full article archive as read in one set-based database operation.
create or replace function public.mark_all_articles_read(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  insert into public.read_status (user_id, article_id)
  select target_user_id, article.id
  from public.articles as article
  on conflict (user_id, article_id) where user_id is not null do nothing;
end;
$$;

revoke all on function public.mark_all_articles_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_all_articles_read(uuid) to service_role;
