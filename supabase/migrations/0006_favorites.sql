-- 즐겨찾기: 방문자(브라우저)별로 마음에 드는 글을 표시해둔다. read_status와 동일한 패턴 (docs/decisions.md 참고).

create table if not exists public.favorites (
  visitor_id text not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (visitor_id, article_id)
);

create index if not exists favorites_article_id_idx on public.favorites (article_id);

alter table public.favorites enable row level security;
