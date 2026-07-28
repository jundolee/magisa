# 결정 기록 (경량 ADR)

나중에 "왜 이렇게 했더라"를 다시 겪지 않기 위한 짧은 결정 로그. 새로운 결정이 생기면 아래 형식으로 추가한다.

---

### 2026-07-28 — 로그인/인증을 MVP에서 제외
**결정**: MVP는 로그인 없이 배포하고, 인증은 Phase 2 이후로 미룬다.
**이유**: 본인만 쓰는 서비스라 당장 로그인 로직을 만드는 비용 대비 실익이 낮다는 사용자 판단.
**영향**: DB 접근은 서버 사이드 서비스 롤 키로만 수행 (클라이언트 직접 접근 금지). `user_id` 컬럼은 nullable로 미리 마련해 이후 로그인 도입 시 스키마 재설계 없이 백필만 하면 되도록 함.

### 2026-07-28 — 스크래핑 폴백을 MVP부터 포함
**결정**: RSS 없는 사이트를 위한 스크래핑(JSON 셀렉터 설정) 기능을 1차 범위에 포함.
**이유**: 사용자가 구독하는 블로그 중 RSS가 없는 곳이 실제로 존재할 가능성이 높아, 이후로 미루면 MVP의 실사용성이 떨어짐.
**영향**: 헤드리스 브라우저 대신 `cheerio` 기반 정적 파싱으로 범위를 제한해 구현 복잡도를 관리.

### 2026-07-28 — OPML 임포트 대신 URL 목록 일괄 등록
**결정**: 기존 RSS 리더의 OPML 내보내기 파일을 임포트하는 대신, 사용자가 테크 블로그 사이트 주소들을 붙여넣으면 한 번에 등록되는 기능으로 대체.
**이유**: 사용자에게 기존 OPML 파일이 없음. 반면 알고 있는 블로그 주소 목록은 있으므로, OPML 파싱보다 훨씬 단순한 방식으로 동일한 목적(일괄 등록)을 달성 가능.
**영향**: OPML XML 파싱 로직이 필요 없어짐 — 등록된 URL 목록을 줄 단위로 나눠 기존 단건 등록 로직(피드 자동탐지)을 재사용하면 됨.

### 2026-07-28 — 읽음 상태를 `articles.is_read` 컬럼으로 처리 (조인 테이블 아님)
**결정**: 별도의 `read_status` 조인 테이블을 만들지 않고 `articles` 테이블에 `is_read` boolean 컬럼을 둔다.
**이유**: 현재 단일 사용자 구조에서는 "이 글을 누가 읽었는지" 구분이 필요 없다. 조인 테이블은 여러 사용자가 같은 글을 공유해서 보는 시나리오에서나 필요한데, 지금 계획엔 없다.
**영향**: 목록 조회 시 조인 없이 바로 읽음 상태를 가져올 수 있어 쿼리가 단순해짐. 향후 진짜 다중 사용자 구조로 바뀌면 그때 테이블을 분리.

### 2026-07-28 — 배포/크론은 Vercel, DB/Auth는 Supabase
**결정**: Next.js + Vercel(Cron 포함) + Supabase(Postgres) 조합으로 진행.
**이유**: SEED Design이 React 기반이라 Next.js가 자연스럽고, Vercel Cron으로 별도 서버 없이 일일 수집 작업을 처리할 수 있음. Supabase Edge Function(Deno)은 `rss-parser`/`cheerio` 호환성이 불확실해 배제.
**영향**: 전체 앱이 하나의 Next.js 프로젝트/배포 단위로 관리됨.

### 2026-07-28 — SEED Design은 Next.js 미검증 상태로 착수 시 최우선 스파이크
**결정**: SEED Design 공식 문서에 Next.js 전용 가이드가 없다는 것을 확인했지만, "Manual install" 경로로 충분히 동작할 가능성이 높다고 보고 진행하되, 구현 착수 시 다른 작업보다 먼저 검증한다.
**이유**: 번들러 플러그인 없이 순수 npm 설치 + CSS import + CLI로 컴포넌트 소스를 복사하는 방식이라 Next.js의 Webpack/Turbopack 설정과 충돌할 여지가 적음. 다만 실제로 검증된 사례를 찾지 못했음.
**영향**: 구현 1단계는 "빈 Next.js 프로젝트 + SEED Design 컴포넌트 1개 정상 렌더링 확인"이 되어야 함. 실패해도 디자인 토큰만 가져다 쓰는 대안이 있어 완전히 막히지는 않음.

### 2026-07-28 — 스파이크 검증 완료: SEED Design + Next.js 16 (App Router, Turbopack) 정상 동작
**결정**: Manual install 경로(`npm install @seed-design/react @seed-design/css` + CLI `init`/`add`)로 Next.js 16 App Router 프로젝트에 `ui:action-button`을 설치, `npm run build`로 정적 프리렌더링까지 성공 확인. `seed-design.json`의 `rsc` 값은 CLI 기본값(`false`)이 아니라 **`true`로 수동 변경**해야 생성되는 컴포넌트 파일에 `"use client"`가 올바르게 붙는다 (App Router/RSC 환경이므로).
**이유**: 실제 `next build` 결과물(`​.next/server/app/index.html`)에서 `data-seed-color-mode="light"`가 `<html>`에 반영되고, `<button class="seed-action-button ...">`가 정상 렌더링되는 것을 확인함.
**영향**: `architecture.md` 4절의 리스크가 해소됨 — 번들러 플러그인 없이도 정상 동작. 이후 컴포넌트 추가 시 `seed-design.json`의 `rsc: true` 설정을 유지할 것.

### 2026-07-28 — 로컬 개발 환경: 회사 Cato Networks TLS 프록시로 인해 Node의 외부 호스트 fetch가 실패하는 문제 발견 및 해결
**결정**: `npx @seed-design/cli add`가 `fetch failed`(`SELF_SIGNED_CERT_IN_CHAIN`)로 실패 — 원인은 회사 네트워크의 Cato Networks SASE 프록시가 TLS를 가로채 자체 인증서로 재서명하기 때문. Windows는 이 루트 인증서를 신뢰하지만 Node.js는 자체 CA 번들을 사용해 신뢰하지 않음. Windows 인증서 저장소에서 `Cato Networks Root CA`를 PEM으로 내보내 `NODE_EXTRA_CA_CERTS` 환경변수로 Node에 알려주는 방식으로 해결.
**이유**: 인증서 검증 자체를 끄는 것(`NODE_TLS_REJECT_UNAUTHORIZED=0`)은 보안상 하지 않음 — 이미 OS가 신뢰하는 회사 루트 CA를 Node에도 동일하게 알려주는, 검증을 유지하는 정상적인 해결책.
**영향**: 상세 내용과 재현 방법은 `docs/dev-environment.md` 참고. **이 문제는 로컬 개발 PC에서 `npx`로 외부 레지스트리(seed-design.io 등)에 접근할 때만 발생하며, Vercel 배포/프로덕션 크론 작업에는 영향 없음.**

### 2026-07-28 — SEED Design `TextFieldTextarea`의 `rows` prop 타입 버그 우회
**결정**: `@seed-design/react-text-field`의 `TextFieldTextareaProps`가 `TextareaHTMLAttributes` 대신 `InputHTMLAttributes`를 상속하도록 잘못 타이핑되어 있어 `rows` prop이 TS 에러를 낸다 (런타임에는 실제 `<textarea>` DOM 엘리먼트라 `rows`가 정상 동작하지만 타입 정의만 누락됨). `rows` 대신 `style={{ minHeight }}`로 초기 높이를 지정하는 방식으로 우회.
**이유**: 라이브러리 자체의 타입 정의 버그이므로 우리 쪽에서 `any` 캐스팅 등으로 억지로 우회하기보다, 어차피 `autoresize`가 기본 동작이라 굳이 `rows`가 필요하지 않고 `minHeight`로 대체 가능.
**영향**: `src/components/add-source-form.tsx`, `src/components/bulk-add-source-form.tsx`. 이후 SEED Design 버전이 올라가 타입이 고쳐지면 `rows`로 되돌려도 무방.

### 2026-07-28 — 크로스소스 중복 제거: `canonical_url` 전역 유니크 제약 추가
**결정**: 여러 소스를 등록하면 같은 글이 서로 다른 소스(원본 블로그 + 큐레이션/집계 사이트 등)에서 각각 수집되어 중복 저장될 수 있음. 기존 `unique(source_id, dedup_key)`는 소스별로만 유니크해서 이 케이스를 못 막았음. `articles`에 `canonical_url`(정규화된 URL) 컬럼을 추가하고 전역 `unique(canonical_url)` 제약을 걸어, 어느 소스에서 왔든 같은 URL이면 먼저 들어온 것만 남고 이후 것은 버려지도록 함. `ingestSource()`는 배치 upsert 대신 한 건씩 삽입하며 unique violation(23505)을 "중복으로 스킵"으로 처리 (실패로 취급하지 않음).
**이유**: guid는 소스마다 다르게 부여되는 경우가 많아(같은 글이어도 소스 A의 guid ≠ 소스 B의 guid) dedup_key만으로는 크로스소스 중복을 못 잡음. URL은 실제로 같은 글이면 대체로 동일하므로 전역 URL 유니크가 더 안전한 기준. 실제로 두 개의 임시 소스에 동일 URL·다른 guid로 삽입을 시도해 두 번째가 23505로 정상 거부되는 것을 확인함 (`supabase/migrations/0002_cross_source_dedup.sql`).
**영향**: `src/lib/ingestion/ingest-source.ts`. 한 건씩 순차 삽입이라 소스당 글이 아주 많으면(수백 건 이상) 배치 방식보다 느릴 수 있음 — 지금 규모(개인용, 소스별 수십 건)에서는 문제 없고, 필요해지면 나중에 병렬화 검토.
**surfit.io 테스트 결과**: `www.surfit.io`는 홈페이지뿐 아니라 `/feed`, `/rss.xml`, `/sitemap.xml` 등 모든 경로가 동일한 7.7KB SPA 셸을 반환하는 완전 CSR 사이트로 확인됨 (naver d2와 같은 유형). RSS도 없고 스크래핑도 원천적으로 불가능해 현재 아키텍처로는 자동 소스 등록 대상이 아님.

### 2026-07-28 — 스크래핑 등록을 "자동 탐지 + 미리보기"로 개편
**결정**: RSS 없는 사이트를 등록할 때 사용자가 CSS 셀렉터 JSON을 직접 손으로 작성해야 했던 것이 너무 어렵다는 피드백을 받고, 등록 플로우를 2단계(미리보기 → 확인 후 저장)로 바꿈. RSS/Atom이 없으면 서버가 페이지 구조를 휴리스틱으로 분석해 `scrape_config`를 자동으로 추론하고, 실제 추출 결과(제목/썸네일/요약 샘플)를 사용자에게 먼저 보여준 뒤에만 저장한다. 자동 추론이 틀렸거나 실패하면 그 자리에서 JSON을 직접 고쳐 다시 미리보기할 수 있다.
**이유**: 미리보기 없이 자동 추론 결과를 바로 신뢰하고 저장하는 것은 위험함(추론이 항상 맞는다는 보장이 없음). "휴리스틱 + 사람의 눈 확인"을 짝지어야 안전하게 자동화 이득을 볼 수 있다고 판단.
**구현 (`src/lib/ingestion/auto-detect-scrape-config.ts`)**: 페이지의 모든 엘리먼트를 (태그, 첫 클래스) 기준으로 그룹핑해 반복되는 패턴을 찾고, "링크+텍스트(8자 이상)를 모두 갖춘 엘리먼트 개수", "그중 서로 다른 URL을 가리키는 비율(≥80%)", "그중 텍스트도 서로 다른 비율(≥80%)" 세 조건을 만족하는 그룹 중 가장 많이 반복되는 것을 글 목록으로 판단. 제목/요약/날짜 셀렉터는 하위 엘리먼트 클래스명에서 "title/desc/date" 등 키워드를 찾거나(가장 안쪽=마지막 매칭 우선), 없으면 h1-h4/time 태그로 폴백.
**실제 검증 과정에서 잡은 버그들**:
1. **텍스트 다양성 체크 누락**: 처음엔 "distinctHrefs≥80%"만 체크했더니, bucketplace의 카테고리 태그 pill(`p...tags__item`, 예: "AI frontier", "Teamstory")이 href는 다양한데 텍스트는 몇 개 안 되는 값이 반복되는 걸 진짜 글 목록으로 잘못 골랐음. "텍스트도 서로 달라야 함" 조건을 추가해 해결.
2. **비율 대신 절대 개수 기준으로 변경**: bucketplace는 실제 카드(12개)와 완전히 같은 클래스를 가진 빈 중복 엘리먼트가 24개 더 있어(총 36개, 아마 숨겨진 반응형 레이아웃 변형), "그룹 전체의 80%가 조건을 만족해야 함" 기준이 실패했음. "조건을 만족하는 엘리먼트의 절대 개수"로 평가 기준을 바꿔서 해결.
3. **키워드 매칭 시 첫 번째 대신 마지막(가장 안쪽) 매칭 선택**: "설명" 셀렉터를 찾을 때, 제목+설명을 함께 감싸는 바깥 wrapper(`...__description`)와 설명 텍스트만 담은 안쪽 엘리먼트(`...__description__description`)가 둘 다 "desc" 키워드에 매칭돼서, 문서 순서상 먼저 나오는 바깥 wrapper를 골라 요약에 제목이 중복 포함되는 문제가 있었음. 문서 순서상 부모가 자식보다 먼저 나온다는 점을 이용해 "마지막 매칭"을 택하도록 수정.
**검증**: bucketplace.com/culture/(재현), tech.socarcorp.kr(신규, `<article class="post-card">` + `<h2>` 태그 폴백으로 정확히 감지) 두 개의 서로 다른 실제 사이트에서 정상 동작 확인.
**한계**: 여전히 휴리스틱이라 모든 사이트에서 성공을 보장하지 않음 — 그래서 미리보기 없이는 절대 저장하지 않는 구조를 유지한다. 자동 추론이 실패하거나 결과가 이상하면 사용자가 JSON을 직접 입력해 재시도하는 경로는 그대로 남아있음.

### 2026-07-28 — `scrapeConfig.linkSelector`를 선택값으로 변경 (카드 전체가 `<a>`인 사이트 지원)
**결정**: `bucketplace.com/culture/`(오늘의집 Gatsby 정적 블로그)를 실제로 등록해보니, 글 목록 카드가 `<a class="...post-list__item">`처럼 **앵커 자체가 리스트 아이템**인 구조였음. 기존 코드는 `linkSelector`가 필수였고 `$el.find(linkSelector)`로 자식만 찾아서 이 구조를 지원 못 했음. `linkSelector`를 optional로 바꾸고, 생략 시 리스트 아이템 엘리먼트 자체를 링크로 사용하도록 수정.
**이유**: "카드 전체가 링크"인 구조는 실제로 꽤 흔한 패턴이라 처음부터 지원하는 게 맞다고 판단.
**영향**: `src/lib/ingestion/types.ts`, `src/lib/ingestion/scrape-source.ts`. `https://www.bucketplace.com/culture/`를 실제로 등록해 12건의 글을 정상 수집 확인함 (`listItemSelector: "a.blog-page__post-list__item"`, `linkSelector` 생략).
**추가로 발견한 것 (등록 시 주의)**: 이 사이트의 목록 카드 썸네일 이미지는 **S3 presigned URL**(`X-Amz-Expires=3600`)이라 1시간 뒤 만료됨 — 그대로 저장하면 얼마 안 가 깨진 이미지가 됨. 이 소스는 `thumbnailSelector`를 아예 설정하지 않았음 (썸네일 없이 등록). 또한 목록 카드에 발행일이 없어 `published_at`은 null로 저장됨 (URL slug에 날짜가 박혀있긴 하지만—예: `/post/2026-07-08-...`— 현재 scrape_config는 슬러그에서 날짜를 뽑는 기능은 지원하지 않음, 필요해지면 추후 추가).
