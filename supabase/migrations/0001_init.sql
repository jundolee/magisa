-- 개인 테크 블로그 아카이버 — 초기 스키마
-- docs/architecture.md 2절 참고

create extension if not exists pgcrypto;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  site_url text not null,
  feed_url text,
  feed_type text not null default 'unknown' check (feed_type in ('rss', 'atom', 'scrape', 'unknown')),
  scrape_config jsonb,
  title text,
  is_active boolean not null default true,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  title text not null,
  url text not null,
  excerpt text,
  thumbnail_url text,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  dedup_key text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  unique (source_id, dedup_key)
);

create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_source_id_idx on public.articles (source_id);

-- MVP는 무인증이라 클라이언트(anon/authenticated 롤)는 접근할 필요가 없다.
-- RLS만 켜두고 정책은 만들지 않는다 = service_role(서버 사이드)만 접근 가능, 기본 거부.
-- Phase 2에서 로그인을 붙이면 `auth.uid() = user_id` 기반 정책을 여기 추가한다.
alter table public.sources enable row level security;
alter table public.articles enable row level security;
