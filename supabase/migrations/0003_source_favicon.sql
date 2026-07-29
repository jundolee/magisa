-- 소스(블로그) 라벨 앞에 파비콘을 보여주기 위한 컬럼.
alter table public.sources add column if not exists favicon_url text;
