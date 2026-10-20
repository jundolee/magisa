# AI 요약 운영

## 입력과 생성

- 기존 수집 경로가 DB에 저장한 `articles.title`과 `articles.excerpt`만 요약한다. excerpt는 저장 시 최대 500자다.
- 요약 전용 원문 페이지 fetch는 하지 않고, 본문 전문·URL·사용자 정보도 OpenAI 요청에 넣지 않는다.
- excerpt가 200자 미만이면 모델을 호출하지 않고 `unavailable`로 둔다.
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
- 기존 글 집계: 총 2,340건, excerpt 200자 이상 406건, 200자 미만 1,934건, excerpt 평균 87.1자, 최대 500자. 요약 backfill은 아직 하지 않았다.
- Vercel에 `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` 변수가 Production/Preview에 있는 것을 확인했으며 값을 열람하지 않았다. `OPENAI_SUMMARY_ENABLED=true`는 Preview와 Production 모두 설정했지만 Production 배포는 아직 이전 코드라 호출이 발생하지 않았다.
- Preview commit `403e19b` Ready. production DB에 260자 excerpt 테스트 글 job 1건이 pending으로 들어갔으며 OpenAI 호출은 아직 없다.

## 남은 운영 작업

1. feature branch를 Production으로 배포한다. Production flag는 이미 true지만 새 route가 배포되기 전까지 실행되지 않는다.
2. Vercel Cron Jobs의 `/api/cron/summaries` “Run”을 눌러 pending 테스트 글 1건을 처리하고 OpenAI usage, DB ready row, Preview/Production 상세 UI를 검증한다.
3. 검증 후 기존 excerpt 200자 이상 406개 글을 queue에 넣어 backfill하고, worker가 하루 최대 80건씩 처리하는지 확인한다. 필요하면 Cron Jobs UI에서 추가 수동 batch를 실행한다.

사용자가 정정한 제품 범위는 “기존 수집 정보 요약”이다. 현재 요약 worker는 그 범위에 맞춰 제목·발췌만 읽고 원문 전문을 새로 가져오지 않는다.
