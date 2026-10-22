-- The private-note feature was removed from main. Keep article recommendation
-- tables, triggers, and RPCs; only remove the unused note store and creator RPC.
-- These tables were verified empty on 2026-10-22. Abort if any note data appears
-- before this migration runs so user data is never silently discarded.
do $$
declare
  has_rows boolean;
begin
  if to_regclass('public.zettel_notes') is not null then
    execute 'select exists (select 1 from public.zettel_notes limit 1)' into has_rows;
    if has_rows then
      raise exception 'Refusing to drop public.zettel_notes because it contains data';
    end if;
  end if;

  if to_regclass('public.zettel_note_articles') is not null then
    execute 'select exists (select 1 from public.zettel_note_articles limit 1)' into has_rows;
    if has_rows then
      raise exception 'Refusing to drop public.zettel_note_articles because it contains data';
    end if;
  end if;

  if to_regclass('public.zettel_note_links') is not null then
    execute 'select exists (select 1 from public.zettel_note_links limit 1)' into has_rows;
    if has_rows then
      raise exception 'Refusing to drop public.zettel_note_links because it contains data';
    end if;
  end if;
end;
$$;

drop function if exists public.create_zettel_note_from_article(uuid, uuid, text, text);
drop table if exists public.zettel_note_links;
drop table if exists public.zettel_note_articles;
drop table if exists public.zettel_notes;
