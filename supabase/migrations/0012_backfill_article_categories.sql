-- 기존에 등록된 모든 게시글의 카테고리 및 태그 일괄 분류 (백필)
UPDATE public.articles
SET 
  category = CASE
    -- 1. AI / ML
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(llm|gpt|claude|openai|gemini|rag|prompt|agent|에이전트|생성형|머신러닝|딥러닝|pytorch|tensorflow|transformer|embedding|vector|langchain|ollama)' THEN 'ai_ml'
    -- 2. Mobile
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(ios|swift|swiftui|android|안드로이드|kotlin|compose|flutter|플러터|react native|리액트 네이티브|app store|앱스토어)' THEN 'mobile'
    -- 3. DevOps / Infra
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(kubernetes|k8s|쿠버네티스|docker|도커|aws|gcp|terraform|테라폼|ci\/cd|github actions|argo|helm|sre|모니터링|grafana|prometheus|보안|security|vpc|nginx)' THEN 'devops'
    -- 4. Data / Analytics
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(data engineering|spark|스파크|kafka|카프카|hadoop|flink|bigquery|빅쿼리|snowflake|dbt|etl|데이터 파이프라인|sql|데이터 웨어하우스|데이터 레이크)' THEN 'data'
    -- 5. Frontend
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(react|리액트|next\.?js|vue|svelte|css|tailwind|html|javascript|자바스크립트|typescript|타입스크립트|web performance|웹 성능|브라우저|canvas|webgl|webpack|vite|rollup|turbopack|ui\/ux|design system|디자인 시스템)' THEN 'frontend'
    -- 6. Backend
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(spring|스프링|java|자바|jpa|hibernate|node\.?js|nestjs|nest|express|golang|고랭|django|fastapi|python|파이썬|mysql|postgresql|redis|mongodb|rdbms|트랜잭션|database|데이터베이스|microservice|msa|아키텍처|architecture|api|grpc|rest api)' THEN 'backend'
    -- 7. Culture & Career
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(회고|조직문화|엔지니어링 리더십|팀 문화|채용|온보딩|애자일|스크럼|스프린트|코드 리뷰|코드리뷰|성장기|이직|커리어|cultur|agile|leadership|post-mortem)' THEN 'culture'
    -- 8. General
    ELSE 'general'
  END,
  tags = CASE
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* 'next\.?js' THEN array['nextjs']
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(react|리액트)' THEN array['react']
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(spring|스프링)' THEN array['spring']
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(k8s|kubernetes|쿠버네티스)' THEN array['k8s']
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(llm|gpt|openai)' THEN array['llm']
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(docker|도커)' THEN array['docker']
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(ios|swift)' THEN array['ios']
    WHEN (title || ' ' || coalesce(excerpt, '')) ~* '(android|kotlin)' THEN array['android']
    ELSE '{}'::text[]
  END;
