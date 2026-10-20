# AI 요약 운영

## 기본 동작

- 모델 기본값은 `gpt-5.6-luna`이며 `OPENAI_SUMMARY_MODEL`로 변경할 수 있다.
- 허용된 출처에서 새로 수집된 글만 `article_summary_jobs`에 등록하고, 별도 일일 worker가 원문 페이지를 제한적으로 추출해 요약한다. 기존 글을 소급 등록하지 않는다.
- 본문 추출은 저장된 article ID의 URL만 사용하고, HTTP(S)·표준 포트·공개 DNS 주소만 허용한다. redirect, 사설/루프백 IP, 비 HTML 응답, 1.5MB 초과 응답은 차단한다. 403/로그인 벽은 우회하지 않는다.
- `<article>` 또는 본문 후보에서 충분한 텍스트가 확인된 경우에만 모델로 보낸다. 부분/짧은 콘텐츠, 오류 페이지는 요약하지 않는다. 전문 텍스트는 요청 처리 중에만 메모리에 두며 DB에는 저장하지 않는다.
- 입력은 최대 12,000자, 출력은 최대 320 토큰으로 제한한다. API 요청은 `store: false`로 전송한다.
- 생성 요약은 `article_summary_jobs`에 1건/글로 저장한다. job은 pending → processing → ready/unavailable/failed 상태를 사용하고 lease 만료와 최대 3회 시도로 복구한다. 상세 drawer와 직접 상세 페이지는 ready 상태만 요약으로 표시한다.
- Vercel 일일 요약 cron은 실행당 최대 8건, 동시 4건을 처리한다. 5,000 입력 토큰과 200 출력 토큰의 예시 요청은 약 $0.00124이며, 실제 비용은 저장하는 usage 토큰 수로 확인한다. 모델 지연은 기존 수집 cron의 시간 예산에 포함되지 않는다.

## 비활성 상태에서 운영 활성화까지

기본값은 비활성화다. 다음 조건을 모두 확인한 뒤 순서대로 활성화한다.

1. 각 출처의 본문 수집·외부 OpenAI API 전송·생성 요약 노출에 대한 이용 조건을 확인하고, 허용된 `sources.id`만 기록한다. robots.txt나 피드 공개 여부만으로 허용 목록에 넣지 않는다.
2. 원격 Supabase migration history와 실제 스키마 기준선을 대조한다. 현재 history 테이블은 없지만 live catalog가 로컬 0001–0014 테이블·제약·인덱스·함수와 일치함을 확인했다. 과거 migration history 경로를 정리하기 전에는 `supabase db push`를 실행하지 않는다.
3. 기준선 대조 후 `0015_article_summary_jobs.sql`만 Supabase Dashboard의 SQL Editor에서 적용하고, `article_summary_jobs` 테이블과 claim RPC의 service-role 접근을 확인한다. 이 단일 additive migration은 기존 테이블 데이터를 변경하지 않는다.
4. Vercel 환경변수에 `OPENAI_API_KEY`를 등록하고, 허용된 UUID만 `OPENAI_SUMMARY_ALLOWED_SOURCE_IDS`에 입력한다. 그 다음 `OPENAI_SUMMARY_ENABLED=true`로 켠다. 셋 중 하나라도 빠지면 job 등록·처리가 비활성 상태로 남는다. 기본 모델을 유지하려면 `OPENAI_SUMMARY_MODEL`은 생략해도 된다.
5. 허용된 테스트 출처에서 새 글 수집 → pending job → 요약 cron → ready row → drawer 표시를 확인하고, OpenAI usage 토큰과 실패 로그를 살핀다.

현재 source audit에서는 명시적 허용이 확인된 출처가 없었다. 따라서 허용 ID 목록은 비워 둔다. 기능 코드는 준비되어도 해당 조건이 바뀌기 전까지 원문 추출과 외부 API 호출은 발생하지 않는다.

2026-10-20 Production 점검: `0015_article_summary_jobs.sql` 적용 완료. job은 0건이며 RLS가 켜져 있고 anon/authenticated 권한은 제거했다. SQL Editor에서 확인한 결과 service_role의 테이블 접근과 `claim_article_summary_jobs(integer)` 실행 권한은 있고, RPC는 `SECURITY DEFINER`와 빈 search_path를 사용한다. 원격 migration history는 여전히 없으므로 `supabase db push`는 실행하지 않는다.

Vercel Project Environment Variables에서 `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` 이름의 Production/Preview 변수가 존재하는 것을 확인했으며 값을 열람하거나 수정하지 않았다. 요약 전용 활성화·allowlist 변수는 아직 없으므로 기본 비활성 상태다.
