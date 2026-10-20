# AI 요약 운영

## 입력과 생성

- 기존 수집 경로가 DB에 저장한 `articles.title`과 `articles.excerpt`만 요약한다. excerpt는 저장 시 최대 500자다.
- 요약 전용 원문 페이지 fetch는 하지 않고, 본문 전문·URL·사용자 정보도 OpenAI 요청에 넣지 않는다.
- excerpt가 80자 미만이면 모델을 호출하지 않고 `unavailable`로 둔다.
- Responses API 모델 기본값은 `gpt-5.6-luna`; 요청 입력은 title 300자와 excerpt 500자로 제한하고 출력은 최대 240토큰, `store: false`다.
- 요약은 lead 한 문장과 핵심 포인트 2개로 구성한다. 요약은 입력으로 받은 제목·발췌 범위만 반영하며 원문 전체 요약이라고 표시하지 않는다.
- 저장값은 요약, 모델/prompt 버전, 입력 hash, usage token 수, 상태와 시각뿐이다. 입력 excerpt 원문을 요약 테이블에 복사하지 않는다.

## 큐와 처리량

- 새 글은 요약 기능이 켜져 있고 excerpt가 80자 이상일 때만 idempotent job으로 큐에 들어간다.
- 기존 글 backfill은 운영자가 명시적으로 job을 추가할 때만 발생한다.
- Vercel cron은 1회 최대 80건, 동시 20건을 처리한다. 각 OpenAI 요청은 12초 제한이며 모델 대기는 원문 수집 cron에 포함되지 않는다.
- 상태 흐름은 pending → processing → ready / unavailable / failed다. lease 만료 복구, 실패 최대 3회 재시도, article ID + prompt version 중복 방지를 적용한다.
- `OPENAI_SUMMARY_ENABLED=true`와 `OPENAI_API_KEY`가 모두 있어야 job 등록·처리가 시작된다. 기본값은 비활성이다.

## 현재 배포 상태

- 2026-10-20 Production DB에 `0015_article_summary_jobs.sql`을 적용했다. 테이블은 비어 있으며 RLS, service-role 접근, anon 차단, `claim_article_summary_jobs` 권한을 확인했다.
- 2026-10-20 `0016_summary_worker_batch_limit.sql` 적용 완료. catalog에서 claim 함수의 80건 상한, `service_role` 실행 권한과 anon 차단을 확인했다. migration history가 없으므로 `supabase db push`는 실행하지 않는다.
- 기존 글 집계: 총 2,340건, excerpt 80자 이상 784건, 80자 미만 1,556건, excerpt 평균 87.1자, 최대 500자. 요약 backfill은 아직 하지 않았다.
- Vercel에 `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` 변수가 Production/Preview에 있는 것을 확인했으며 값을 열람하지 않았다. `OPENAI_SUMMARY_ENABLED`는 아직 없고, Production AI 호출은 하지 않았다.
- 커밋 `1f0e366` Preview에서 실제 DB 글 drawer/direct route/관련 기사 표시까지 검증했다. Preview AI 호출은 아직 검증하지 않았다.

## 남은 운영 작업

1. Preview 환경에만 `OPENAI_SUMMARY_ENABLED=true`를 추가해 Preview를 재배포한다.
2. 기존 excerpt가 충분한 테스트 글 1건을 queue에 추가하고 Preview cron으로 실제 요약 생성·저장·UI 표시와 usage token을 확인한다. Preview가 Production DB를 공유하므로 테스트 summary 1건도 Production DB에 보관된다.
3. Preview 검증 후 Production에 `OPENAI_SUMMARY_ENABLED=true`를 적용하고 feature commit을 Production에 배포한다.
4. 기존 784개 eligible 글을 queue에 넣어 backfill하고, worker가 하루 최대 80건씩 처리하는지 확인한다.

사용자가 정정한 제품 범위는 “기존 수집 정보 요약”이다. 현재 요약 worker는 그 범위에 맞춰 제목·발췌만 읽고 원문 전문을 새로 가져오지 않는다.
