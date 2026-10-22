# AI 요약 운영

## 요약 입력 정책

- 배포 전 등록된 글은 그대로 둔다. 기존 excerpt 기반 요약은 `2026-10-20-excerpt-v2` 버전으로 계속 표시하고, 요약이 없던 과거 글에는 새 job을 만들지 않는다.
- 배포 이후 새로 수집된 글만 요약 job에 넣는다. excerpt 길이는 enqueue 조건으로 사용하지 않는다.
- Worker가 새 글의 원문 URL을 서버에서 가져와 본문을 추출한다. `article`/`itemprop=articleBody`를 우선하고, `main` 등은 `partial` 상태로 분류한다. 로그인·구독 벽, 403, 비HTML, DNS/네트워크 오류는 우회하지 않는다.
- Fetch 보호: HTTP/HTTPS와 표준 포트만 허용, DNS 주소를 연결에 고정, 비공개·예약 IP 차단, redirect마다 재검증, HTTPS downgrade 차단, 최대 redirect 3회, 응답 1.5MB·시간 10초 제한.
- 추출 본문은 최대 40,000자까지 메모리에서 처리하며 DB에 저장하지 않는다. 250자 미만은 `unavailable` (원문 및 피드 발췌 모두 불가능할 경우); 40,000자를 넘겨 잘린 본문이나 휴리스틱 선택자·피드 발췌 폴백은 `partial`로 기록한다.
- Responses API에는 제목 최대 300자와 추출 본문만 보내며, 모델은 `gpt-5.6-luna`, `store: false`, 출력은 최대 240토큰이다. API 요청에는 원문 URL·사용자 계정·검색어를 넣지 않는다.
- 저장값은 요약, 추출 상태, 모델/prompt 버전, 입력 hash, usage token, 처리 상태와 시각이다. 원문 본문 자체는 저장하지 않는다.

## 신규 글 처리와 처리량

- `OPENAI_SUMMARY_ENABLED=true`와 `OPENAI_API_KEY`가 있을 때만 새로 삽입된 글이 `2026-10-21-full-article-v1` job으로 큐에 들어간다. 기존 글을 훑는 backfill 경로는 없다.
- 요약 worker는 한 번에 8건, 동시 4건까지 처리한다. 각 원문 fetch는 최대 10초, OpenAI 요청은 최대 12초다. 네 개의 Vercel Cron 경로가 하루에 총 최대 32건을 처리하도록 6시간 간격으로 배치한다. 대기열이 일일 처리량보다 커지면 pending 상태로 다음 실행을 기다린다.
- Worker는 `claim_article_summary_jobs_by_version` RPC로 새 prompt 버전만 claim한다. 기존 excerpt job의 pending/failed 상태가 남아 있어도 새 worker가 가져가거나 내용을 바꾸지 않는다.
- 상태 흐름은 `pending → processing → ready / unavailable / failed`다. 네트워크/모델 실패는 최대 3회 재시도하며 lease 만료 후 복구한다.
- UI는 새 full-article 버전을 우선 사용한다. 새 버전이 없으면 기존 excerpt 버전을 읽어 구버전 요약을 그대로 보여준다. 새 요약에는 `full_article` 또는 `partial_article`, 기존 요약에는 `excerpt` 근거 안내가 표시된다.

## 개인정보·외부 처리

- 새 요약은 원문에서 추출한 본문을 OpenAI API에 전송하므로 `/privacy`에서 입력 범위와 처리 목적을 안내한다.
- `store: false`는 Zero Data Retention을 뜻하지 않는다. OpenAI의 기본 API abuse-monitoring 로그는 최대 30일 보관될 수 있으며, 승인된 데이터 보존 제어 설정에 따라 달라질 수 있다.

## Production의 기존 데이터와 코드 상태

- 2026-10-20 Production DB에 `0015_article_summary_jobs.sql`과 `0016_summary_worker_batch_limit.sql`을 적용했다. RLS, service-role 권한, anon 차단 및 claim 상한을 확인했다. 원격 migration history가 없으므로 `supabase db push`는 실행하지 않는다.
- 2026-10-21 `0017_claim_article_summary_jobs_by_version.sql`을 Supabase Dashboard SQL Editor에서 수동 적용했다. 새 RPC의 `SECURITY DEFINER`, 빈 `search_path`, service-role 실행 및 anon 실행 차단을 확인했다. 기존 `2026-10-20-excerpt-v2` job은 여전히 413건 모두 `ready`다. `supabase db push`는 계속 사용하지 않는다.
- 2026-10-20 집계: articles 2,340건, excerpt 200자 이상 406건, 200자 미만 1,934건.
- 기존 프로덕션 배포 `10c75e8`에서는 excerpt 기반 job 413건이 `ready`였고, 이전 검증에서 사용량은 입력 142,606토큰·출력 45,800토큰이었다. 이 요약 행은 새 코드에서도 변경하지 않는다.
- 새 full-article worker, 신규 글만 enqueue, 4개 일일 Cron 및 개인정보 안내 변경은 현재 작업 트리 코드다. Production 배포·본문 기반 OpenAI 호출은 아직 하지 않았다.
