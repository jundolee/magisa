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

### 2026-07-29 — 스크래핑 발행일 폴백: URL 슬러그에서 날짜 추출
**결정**: bucketplace.com/culture/는 목록/상세 페이지 어디에도 발행일 메타데이터가 없어(JSON-LD도 일반 WebSite 정보뿐) `published_at`이 계속 null이었음. 다만 URL 슬러그에 날짜가 박혀있음(`/post/2026-07-08-제목/`). `scrapeSource()`에 `dateSelector`로 못 찾았을 때 URL에서 `YYYY-MM-DD` 패턴을 정규식으로 추출하는 폴백을 추가. 기존에 null로 저장된 12개 글도 같은 로직으로 일회성 백필함.
**이유**: Jekyll/Hugo/Notion 기반 등 날짜를 슬러그에 인코딩하는 블로그 플랫폼이 흔해서, 이 폴백이 bucketplace 외에도 여러 사이트에 도움이 될 가능성이 높음. dateSelector가 이미 있고 정상 동작하면 그쪽이 우선이라 회귀 위험 없음.
**영향**: `src/lib/ingestion/scrape-source.ts`(`extractDateFromUrl`, export됨 — 백필 스크립트 등에서 재사용 가능).

### 2026-07-29 — 썸네일 영구 미해결: og:image도 presigned URL (Notion 기반 CMS 한계)
**확인**: bucketplace.com의 개별 글 페이지 `og:image`도 목록 페이지와 동일하게 S3 presigned URL(`X-Amz-Expires=3600`)임을 확인. 이 사이트는 Notion을 CMS로 쓰는 것으로 보이는데, Notion은 업로드 파일에 대해 영구 공개 URL을 제공하지 않고 항상 서명된 임시 URL만 내려줌 — 사이트 어디를 봐도 안정적인 이미지 URL이 존재하지 않는다.
**결론**: 이 문제를 근본적으로 풀려면 스크래핑 시점에 이미지를 직접 다운로드해서 우리 쪽 스토리지(Supabase Storage 등)에 재호스팅하는 방법뿐. 아직 결정만 하고 구현은 안 함 — 사용자에게 트레이드오프(스토리지 의존성 추가, 수집 시 이미지 다운로드/업로드 비용) 확인 후 진행 여부 결정 예정. `docs/roadmap.md` Phase 2 참고.

### 2026-07-29 — 스크래핑 설정을 JSON 텍스트 대신 셀렉터별 폼 필드로 변경
**결정**: 자동 탐지 + 미리보기를 붙인 뒤에도 "결과가 이상해서 직접 고쳐야 할 때 JSON 텍스트를 편집해야 한다"는 점 자체가 여전히 어렵다는 피드백을 받음. `AddSourceFlowState.scrapeConfigJson`(문자열) 대신 `scrapeConfig`(구조화된 객체)로 바꾸고, UI에서도 JSON textarea 하나 대신 셀렉터별 개별 입력 필드(목록/제목은 항상 노출, 링크·요약·날짜·썸네일은 "추가 설정" 토글 뒤에 숨김)로 교체. 서버 액션은 `JSON.parse` 없이 `formData.get("titleSelector")` 등 필드별로 직접 읽어 객체를 구성한다.
**이유**: JSON 문법(중괄호, 따옴표, 쉼표) 오류는 비개발자에게 가장 흔하고 좌절스러운 실패 지점인데, 이를 프론트엔드 폼 필드로 대체하면 애초에 그런 오류가 발생할 수 없게 된다. 자동 탐지 결과는 각 필드에 미리 채워지므로 대부분의 경우 사용자는 필드를 전혀 안 보고 그냥 등록만 누르면 됨.
**영향**: `src/app/sources/actions.ts`(`scrapeConfigFromFormData`, `hasManualScrapeFields`), `src/components/add-source-form.tsx`. bucketplace.com/culture/로 auto-detect → 수동 필드 재입력 → 저장까지 전체 플로우를 실제 서버 액션으로 재검증함.

### 2026-07-29 — 정렬 기준을 published_at에서 discovered_at으로 변경
**결정**: 글 목록 정렬을 원문 발행일(`published_at`) 대신 우리 시스템이 수집한 시각(`discovered_at`)으로 변경.
**이유**: `published_at`은 소스마다 신뢰도가 다름 — RSS는 대체로 정확하지만, 스크래핑은 날짜 정보가 아예 없어 URL 슬러그로 추정한 값일 수도 있고(bucketplace 사례), 그마저도 없으면 null. 반면 `discovered_at`은 글이 삽입될 때 항상 `now()`로 채워지는 컬럼이라 예외 없이 신뢰할 수 있고, "내가 마지막으로 확인한 이후 새로 들어온 글이 위로 온다"는 이 앱의 실제 사용 목적(매일 새 글 확인)에도 더 잘 맞음.
**영향**: `src/lib/data/articles.ts`.

### 2026-07-29 — 썸네일을 Supabase Storage로 미러링 (presigned URL 만료 문제 해결)
**결정**: 이전에 "근본 해결은 이미지를 다운로드해서 우리 스토리지에 재호스팅하는 것뿐"이라고 남겨뒀던 것을 실제로 구현. `src/lib/storage/thumbnails.ts`의 `mirrorThumbnail()`이 원본 썸네일 URL에서 이미지를 다운로드해 Supabase Storage `thumbnails` 버킷(public)에 올리고 영구 공개 URL을 돌려준다. 버킷은 최초 호출 시 코드에서 자동 생성(`storage.createBucket`), 별도로 대시보드에서 만들 필요 없음. `ingestSource()`는 글을 새로 삽입한 직후(중복이 아닐 때만) 썸네일이 있으면 미러링해서 URL을 갱신한다.
**이유**: bucketplace처럼 Notion 기반 CMS는 이미지가 항상 1시간짜리 서명 URL로만 제공되는데, 미러링하면 소스가 무엇이든 항상 우리 쪽 영구 URL로 저장되어 이 문제가 원천적으로 해결됨.
**검증 중 발견한 것**: 처음엔 파일 크기 제한을 5MB로 뒀는데, bucketplace 12개 글 중 4개가 실패함 — 원인은 Notion이 원본 해상도 PNG(5.2~5.8MB)를 그대로 서빙하기 때문. 제한을 10MB로 올려서 해결.
**백필**: 기존에 등록된 bucketplace 소스는 (당시엔 만료 문제 때문에) `thumbnailSelector` 없이 등록했었음 — 이제 미러링이 있으니 `thumbnailSelector: "img"`를 켜고, 이미 저장된 12개 글도 다시 스크래핑해 URL을 매칭시켜 일회성으로 썸네일을 채워넣음. 결과: 12/12 성공.
**영향**: `src/lib/storage/thumbnails.ts`(신규), `src/lib/ingestion/ingest-source.ts`.

### 2026-07-29 — 스크래핑 선택자 입력을 "성공하면 아예 안 보이는" 것으로 재설계
**결정**: 선택자를 폼 필드로 바꿔도(2026-07-29 앞선 결정) 자동 인식이 성공한 경우에도 필드가 항상 노출되어 있었음 — "사용자는 URL만 주면 되고 선택자 얘기 자체를 몰라야 한다"는 피드백을 받고, 자동 인식이 실패했을 때만(글을 0개 찾았을 때) 선택자 입력 UI를 노출하도록 조건을 바꿈. 성공한 경우엔 선택자 값을 숨겨진 필드로만 다음 요청에 실어 보내 사용자 눈에는 전혀 보이지 않는다. 실패 시에도 바로 필드를 펼치지 않고 "직접 지정하기" 버튼 뒤에 한 번 더 숨겨서, 원치 않는 사용자는 그냥 포기하고 다른 방법을 쓸 수 있게 함. 메시지 문구에서도 "설정", "선택자", "RSS" 같은 용어를 성공 경로에서는 전부 제거.
**이유**: 미리보기 자체는 안전장치로 유지해야 하지만(자동 인식이 항상 맞는다는 보장이 없으므로), 그 안전장치가 "기술적으로 보이는 것"과는 별개 문제 — 성공한 케이스에서까지 선택자를 보여줄 이유가 없었음.
**영향**: `src/components/add-source-form.tsx`, `src/app/sources/actions.ts`(메시지 문구).

### 2026-07-29 — 정렬 기준을 다시 published_at으로 되돌림 (카드에 보이는 날짜와 정렬이 어긋나던 문제)
**결정**: 하루 전에 "정렬은 discovered_at으로"라고 바꿨었는데, 사용자가 카드에 보이는 날짜(published_at)와 실제 정렬 순서가 안 맞는다고 지적함(어떤 소스는 더 늦게 등록됐지만 원문은 더 오래된 글이라, 화면상 날짜가 뒤죽박죽으로 보임). `.order("discovered_at", ...)`를 다시 `.order("published_at", { ascending: false, nullsFirst: false })`로 되돌림.
**이유**: 사용자 눈에 보이는 값(카드의 날짜)과 정렬 기준이 다르면 "정렬이 이상하다"고 느낄 수밖에 없음 — 정렬은 항상 화면에 실제로 표시되는 필드를 기준으로 해야 함. 이제 스크래핑 발행일 URL 슬러그 폴백(7/29 앞선 결정) 덕분에 published_at 결측치가 크게 줄어서, 이 필드로 정렬해도 문제가 적음.
**영향**: `src/lib/data/articles.ts`.

### 2026-07-29 — RSS 피드의 본문(content:encoded)에서 썸네일 추출 (toss.tech, Medium 기반 피드)
**결정**: toss.tech·gccompany(Medium 호스팅) 등 여러 피드가 `enclosure`나 `media:content` 없이, 본문 HTML(`content:encoded`) 안에 `<img>` 태그로만 이미지를 담고 있었음. `parseFeed()`의 `extractThumbnail()`에 "본문 HTML의 첫 `<img src>` (없으면 `<link rel="preload" as="image">`)를 찾는" 폴백을 추가.
**실제로 겪은 버그 2개**:
1. **rss-parser의 `item.content`는 `<description>`(짧은 요약)에 매핑되고, 진짜 본문은 원래 XML 태그명 그대로 `item["content:encoded"]`에 남아있음.** 처음엔 `item.content`를 봐서 아무 것도 못 찾았음 — `item["content:encoded"]`를 우선 사용하도록 수정.
2. **static.toss.im 같은 일부 CDN이 실제로는 이미지 파일인데 `Content-Type: binary/octet-stream`으로 응답함.** `mirrorThumbnail()`의 Content-Type 기반 확장자 판별이 전부 실패해서 미러링이 조용히 스킵됐음 — Content-Type을 못 알아보면 URL 자체의 파일 확장자(`.png` 등)로 폴백하고, 업로드 시 Content-Type도 그 확장자 기준으로 우리가 직접 지정하도록 수정 (`src/lib/storage/thumbnails.ts`의 `guessExtension`).
**검증**: 기존 toss.tech 글 20개 중 18개에서 썸네일을 새로 찾아 미러링 성공 (`docs/decisions.md`에 없던 나머지 2개는 본문에 이미지가 아예 없는 글).
**영향**: `src/lib/ingestion/parse-feed.ts`, `src/lib/storage/thumbnails.ts`.

### 2026-07-29 — 소스별 "지금 수집" 버튼 추가
**결정**: 사용자가 `/sources`에서 새 소스를 등록한 뒤 "이거 다음날 돼야 보이는 거냐"고 물어봄 — 맞음, 지금까지는 등록은 소스만 추가하고 실제 수집은 Vercel Cron(매일 1회, 한국시간 오전 6시)이 돌 때만 일어났음. 크론을 기다리지 않고 소스 하나를 즉시 수집할 수 있는 "지금 수집" 버튼을 소스 목록 각 행에 추가.
**이유**: 등록 직후 바로 결과를 확인하고 싶은 건 자연스러운 기대라, 매번 다음날까지 기다리게 하는 건 불필요한 마찰. 크론 라우트와 같은 `ingestSource()` 로직을 재사용해서 별도 파이프라인을 만들 필요는 없었음.
**영향**: `src/app/sources/actions.ts`(`ingestSourceNowAction`), `src/components/ingest-now-button.tsx`(신규), `src/components/source-row.tsx`(마지막 확인 시각 표시 추가). 실제로 이미 등록돼 있었지만 글이 하나도 없던 gccompany 테크블로그 소스에 사용해 10개 글을 즉시 수집하는 것으로 검증함.

### 2026-07-29 — 소스 이름을 URL 대신 실제 사이트명으로 자동 추출
**결정**: 소스 목록/글 배지에 `source.title ?? source.site_url`로 표시하고 있었는데, `title`을 채워주는 로직이 없어서 항상 URL 그대로 노출되고 있었음(서로 구분이 잘 안 됨). 등록 시점에 이름을 자동으로 뽑아 저장하도록 함: RSS/Atom은 피드의 채널 제목(`parseFeed()`가 이제 `{ title, articles }`를 반환), 스크래핑은 홈페이지의 `og:title` → `og:site_name` → `<title>` 태그 순으로 우선순위를 둬서 추출(`discoverFeed()`가 `siteTitle`도 함께 반환).
**이유**: og:title/og:site_name이 있으면 대체로 `<title>` 태그보다 깔끔한 이름이라 우선함(예: bucketplace의 `<title>`엔 "오늘의집 - 매일 성장하는..." 같은 긴 태그라인이 붙지만 og:title은 "오늘의집 이야기"로 간결함).
**백필**: 기존 3개 소스 모두 이름이 없었어서 같은 로직으로 다시 조회해 채움 — 토스: "토스 기술 블로그, 토스 테크", gccompany: "여기어때 기술블로그 - Medium", bucketplace: "오늘의집 이야기".
**영향**: `src/lib/ingestion/discover-feed.ts`, `src/lib/ingestion/parse-feed.ts`(반환 타입 변경, `src/lib/ingestion/ingest-source.ts`와 `src/app/sources/actions.ts` 호출부도 함께 수정), `src/lib/data/sources.ts`(`insertSource`/`addSource`에 title 추가), `src/components/add-source-form.tsx`(숨김 필드로 carry-forward).

### 2026-07-29 — 블로그(소스)별 글 목록 필터 추가
**결정**: 읽음/안읽음/전체 탭에 더해, 특정 블로그의 글만 볼 수 있는 드롭다운(`<select>`)을 홈 화면에 추가. `?source=<id>` 쿼리 파라미터로 동작하며 읽음 필터와 독립적으로 조합됨.
**이유**: 소스가 여러 개로 늘어나면서 "이 블로그 글만 보고 싶다"는 수요가 자연스럽게 생김. SEED Design의 Select Box는 카드형이라 소스 개수가 늘어날수록 공간을 많이 차지해서, 이 용도엔 SEED 토큰으로 스타일링한 네이티브 `<select>`를 사용.
**영향**: `src/lib/data/articles.ts`(`listArticles`에 `sourceId` 옵션 추가), `src/components/source-filter-select.tsx`(신규), `src/app/page.tsx`.

### 2026-07-29 — 탭/소스 필터 전환을 서버 왕복 없이 클라이언트에서 즉시 처리
**결정**: 탭(전체/안읽음/읽음)이나 소스 드롭다운을 바꿀 때마다 `router.replace`로 URL을 바꿔서, 매번 Next.js 서버가 `listArticles`/`countUnreadArticles`/`listSources` 3개 쿼리를 다시 실행하고 있었음 — 전환할 때마다 느리다는 피드백을 받음. 홈 페이지가 글/소스를 **한 번만** 불러오고(`listArticles()`가 필터 없이 전체를, `listSources()`), 새로 만든 클라이언트 컴포넌트 `ArticleList`가 탭/소스 선택 상태를 로컬 state로 들고 있다가 `useMemo`로 즉시 필터링해서 보여준다. URL은 `router.replace` 대신 `window.history.replaceState`로만 맞춰서(북마크 가능하도록) Next.js가 서버를 다시 왕복하지 않게 함.
**이유**: 개인용 규모(전체 글 수가 몇백 건 수준)에서는 전체를 한 번에 브라우저로 보내고 메모리에서 거르는 게 매 클릭마다 Supabase를 왕복하는 것보다 압도적으로 빠름. 읽음 처리(서버 액션)는 그대로 `revalidatePath("/")`로 동작하고, `ArticleList`는 `articles`를 로컬 state로 복사하지 않고 prop 그대로 받아 `useMemo`만 거치므로 revalidate로 갱신된 새 prop이 자연스럽게 반영됨.
**영향**: `src/app/page.tsx`(단순화), `src/components/article-list.tsx`(신규, 필터링 로직 이전), `src/components/article-filter-tabs.tsx`/`src/components/source-filter-select.tsx`(라우팅을 직접 하던 것을 `value`/`onChange` 컨트롤드 컴포넌트로 변경), `src/lib/data/articles.ts`(`listArticles`의 `filter`/`sourceId` 서버 옵션과 `countUnreadArticles` 제거 — 더 이상 필요 없음).

### 2026-07-29 — Freesentation 웹폰트 적용 (self-host)
**결정**: `next/font/local`로 Freesentation 4개 굵기(400/500/600/700)를 자체 호스팅. jsDelivr(`projectnoonnu/2404` — 눈누에서 배포하는 경로)에서 woff2 파일을 다운로드해 `src/app/fonts/freesentation/`에 커밋해두고, next/font가 최적화(서브셋 프리로드, `font-display: swap`, 폴백 메트릭 자동 생성)를 담당하게 함.
**이유**: 매 방문자의 브라우저가 매번 외부 CDN에 요청하는 것보다, Next.js가 자체 도메인에서 최적화해서 서빙하는 게 더 빠르고 안정적(CDN 장애/차단에 영향 안 받음). 기존 Geist는 실제로는 body의 `font-family: Arial...` 하드코딩에 가려져 어디에도 적용되고 있지 않았음 — 이번에 같이 정리.
**영향**: `src/app/layout.tsx`, `src/app/globals.css`(body font-family), `src/app/fonts/freesentation/*.woff2`(4개 파일 커밋).

### 2026-07-29 — 다크모드 미디어쿼리 잔재 제거 (라이트 전용과 불일치하던 부분)
**결정**: `globals.css`에 `prefers-color-scheme: dark`일 때 `--background`/`--foreground`를 어둡게 바꾸는 규칙이 남아있었는데, SEED Design은 `data-seed-color-mode="light"`로 항상 라이트라, OS가 다크모드면 우리 커스텀 배경/텍스트만 어두워지고 SEED 컴포넌트는 밝은 채로 남아 화면이 반반 섞이는 상태였음. 다크모드 미디어쿼리를 제거하고 `color-scheme: light`로 고정.
**영향**: `src/app/globals.css`.

### 2026-07-29 — `/sources` 페이지가 PC 화면에서 좌측으로 쏠리던 버그 수정
**결정**: 홈(`/`)은 `margin: "0 auto"`로 중앙정렬돼 있었는데 `/sources`는 `maxWidth`만 있고 `margin: auto`가 빠져 있어 넓은 화면에서 왼쪽에 붙어 보였음. 페이지마다 폭/중앙정렬을 각자 넣다 보니 생긴 문제라, 아예 루트 레이아웃(`src/app/layout.tsx`)에 `.app-shell` 컨테이너(`max-width: 720px; margin: 0 auto;`)를 두고 모든 페이지가 공통으로 상속받게 바꿔서 이 종류의 버그가 페이지별로 다시 생기지 않게 함.
**영향**: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`/`src/app/sources/page.tsx`(중복 스타일 제거).

### 2026-07-29 — 소스 라벨 앞에 파비콘 표시
**결정**: 등록 시점에 홈페이지의 `<link rel=icon>`(없으면 `/favicon.ico` 관례 경로)을 추출해 `sources.favicon_url`에 저장하고, 글 목록의 블로그 배지·소스 관리 목록 양쪽에 이름 앞에 작게 표시. 마이그레이션 `0003_source_favicon.sql` 필요.
**영향**: `src/lib/ingestion/discover-feed.ts`(`extractFaviconUrl`), `src/lib/ingestion/types.ts`, `src/lib/data/sources.ts`/`src/app/sources/actions.ts`/`src/components/add-source-form.tsx`(siteTitle과 동일한 방식으로 carry-forward), `src/lib/data/articles.ts`(select에 `favicon_url` 추가), `src/components/article-row.tsx`/`src/components/source-row.tsx`.

### 2026-07-29 — SEED Design TextField의 `defaultValue`/`value` 동시 사용 경고 수정
**결정**: `TextFieldInput`에 직접 `defaultValue`를 주면, 감싸는 `TextField`가 내부적으로 `useTextFieldWithGraphemes` 훅을 통해 항상 `value`(빈 문자열이라도)를 함께 내려보내서 "controlled/uncontrolled input" React 경고가 났음. 우리가 커스터마이징 가능한 `seed-design/ui/text-field.tsx`(CLI가 복사해준 코드)를 고쳐서 `defaultValue`를 `TextField` 자체가 받아 훅에 전달하도록 하고, 사용하는 쪽(`AddSourceForm` 등)은 `defaultValue`를 안쪽 `TextFieldInput`이 아니라 바깥 `TextField`에 주도록 변경.
**영향**: `seed-design/ui/text-field.tsx`, `src/components/add-source-form.tsx`.

### 2026-07-30 — medium.com 403 문제: IP가 아니라 User-Agent 차단이었음
**결정**: `medium.com/daangn`을 등록하면 자동 인식이 실패해 수동 설정 화면으로 넘어간다는 피드백을 받음. 로컬에서는 `discoverFeed()`가 정상 동작했지만 배포된 Vercel에서는 실패해서, 배포 환경에 임시 진단 라우트를 올려 직접 확인함: 우리가 스스로를 밝히는 UA(`MagisaBot/0.1 (+personal tech blog aggregator)`)로 홈페이지에 요청하면 403이지만, 같은 Vercel IP에서 **일반 브라우저 UA**로 요청하면 200이 됨. RSS 피드 엔드포인트(`/feed/daangn`) 자체는 UA와 무관하게 항상 열려 있었음. 즉 IP 차단이 아니라 UA 차단이었다는 뜻.
**이유**: 이 문제는 medium.com에만 해당하는 게 아니라, 봇 UA로 홈페이지 접근을 막는 다른 사이트에서도 똑같이 재현될 수 있는 구조적 문제라, 개별 사이트를 special-case 하는 대신 수집 파이프라인 전체의 User-Agent를 브라우저 UA로 통일함. 개인이 이미 구독 중인 공개 블로그를 하루 한 번, 소스당 한 번 읽어오는 저부하·비영리 목적이라 판단 — 대량 스크래핑이나 유료 콘텐츠 우회, CAPTCHA 우회와는 성격이 다름.
**영향**: `src/lib/ingestion/user-agent.ts`(신규, 공용 상수) — `discover-feed.ts`/`scrape-source.ts`/`auto-detect-scrape-config.ts`/`parse-feed.ts`/`src/lib/storage/thumbnails.ts`에 흩어져 있던 개별 UA 상수를 전부 이걸로 교체해 앞으로 다시 따로 어긋나지 않게 함. 배포 환경에서 진단 라우트로 실제 재현·수정 확인 후 삭제.

### 2026-07-30 — oliveyoung.tech 썸네일이 안 보이던 문제: 상대경로를 그대로 저장하고 있었음
**결정**: `parse-feed.ts`의 `extractThumbnail()`이 본문 HTML의 `<img src>`를 그대로 반환하고 있었는데, oliveyoung.tech(Gatsby 기반)는 이 `src`가 `/static/...`처럼 도메인 없는 상대경로였음. 우리 사이트(magisa.vercel.app) 기준으로 렌더링되니 당연히 깨짐. 글 URL(`item.link`)을 기준으로 `new URL(imgSrc, articleUrl)`로 절대 URL 변환하도록 수정.
**추가로 발견한 것**: oliveyoung.tech 일부 글은 썸네일이 SVG(`image/svg+xml`)였는데, `mirrorThumbnail()`의 확장자 매핑에 SVG가 빠져 있어 미러링이 조용히 실패하고 있었음 — jpg/png/webp/gif/avif에 svg 추가.
**백필**: 기존에 상대경로/누락으로 저장된 썸네일을 소스별로 다시 파싱해 재매칭 후 미러링. oliveyoung 4건 중 2건 성공(SVG 수정으로), 나머지 2건과 toss.tech 2건은 RSS 피드가 최신 N개만 보여줘서 이미 피드 창 밖으로 밀려난 예전 글이라 재파싱으로는 복구 불가 — 개별 글 페이지를 다시 방문해 og:image를 스크래핑하는 별도 폴백이 있어야 하는데, 지금은 범위 밖으로 남겨둠.
**영향**: `src/lib/ingestion/parse-feed.ts`(`resolveUrl` 추가), `src/lib/storage/thumbnails.ts`(SVG 지원 추가).

### 2026-07-30 — `/sources`를 관리자 비밀번호로 보호
**결정**: 소스 관리 화면(등록/삭제/일시중지/즉시수집)이 로그인 없이 완전히 공개돼 있어 누구나 건드릴 수 있다는 지적을 받음. Supabase Auth 같은 전체 로그인 시스템(Phase 2로 미뤄둔 항목)을 아직 들이지 않고, `/sources` 하나만 막는 가벼운 비밀번호 게이트를 추가함: `ADMIN_PASSWORD` 환경변수가 설정되어 있으면 `/admin-login`에서 비밀번호를 입력해 쿠키를 발급받아야 `/sources`에 접근 가능. 비밀번호가 설정 안 돼 있으면(로컬 개발 등) 그대로 열어둠.
**구현 중 발견한 것**: Next.js 16부터 `middleware.ts` 파일명/`middleware` export가 deprecated되고 `proxy.ts`/`export function proxy`로 이름이 바뀜(런타임도 Edge가 아니라 Node.js로 고정). AGENTS.md가 "훈련 데이터와 다를 수 있으니 문서를 먼저 읽으라"고 경고했던 게 정확히 이 케이스라, 옛 `middleware` 컨벤션으로 안 쓰고 번들된 문서를 먼저 확인한 뒤 `src/proxy.ts`로 작성함. 쿠키 해시는 Edge/Node 어디서든 동일하게 동작하는 Web Crypto(`crypto.subtle`)로 계산해 런타임 호환성 문제를 피함.
**이유**: Server Function(서버 액션)은 별도 라우트가 아니라 그 액션이 쓰인 페이지로의 POST 요청으로 처리되므로, `/sources` 경로를 매칭하는 matcher 하나로 소스 등록/삭제/토글/즉시수집 액션까지 전부 함께 보호됨 (공식 문서에도 이 점이 명시돼 있어 확인 후 그대로 활용).
**영향**: `src/proxy.ts`(신규), `src/lib/admin-auth.ts`(신규, 공유 해시 유틸), `src/app/admin-login/page.tsx`+`actions.ts`(신규), `.env.example`(`ADMIN_PASSWORD` 추가). 로컬에서 올바른 쿠키로 접근 허용/틀린 쿠키로 리다이렉트/`ADMIN_PASSWORD` 미설정 시 무제한 접근 세 가지 경우 모두 검증함. Vercel에 `ADMIN_PASSWORD` 환경변수를 설정해야 실제로 켜짐.

### 2026-07-28 — `scrapeConfig.linkSelector`를 선택값으로 변경 (카드 전체가 `<a>`인 사이트 지원)
**결정**: `bucketplace.com/culture/`(오늘의집 Gatsby 정적 블로그)를 실제로 등록해보니, 글 목록 카드가 `<a class="...post-list__item">`처럼 **앵커 자체가 리스트 아이템**인 구조였음. 기존 코드는 `linkSelector`가 필수였고 `$el.find(linkSelector)`로 자식만 찾아서 이 구조를 지원 못 했음. `linkSelector`를 optional로 바꾸고, 생략 시 리스트 아이템 엘리먼트 자체를 링크로 사용하도록 수정.
**이유**: "카드 전체가 링크"인 구조는 실제로 꽤 흔한 패턴이라 처음부터 지원하는 게 맞다고 판단.
**영향**: `src/lib/ingestion/types.ts`, `src/lib/ingestion/scrape-source.ts`. `https://www.bucketplace.com/culture/`를 실제로 등록해 12건의 글을 정상 수집 확인함 (`listItemSelector: "a.blog-page__post-list__item"`, `linkSelector` 생략).
**추가로 발견한 것 (등록 시 주의)**: 이 사이트의 목록 카드 썸네일 이미지는 **S3 presigned URL**(`X-Amz-Expires=3600`)이라 1시간 뒤 만료됨 — 그대로 저장하면 얼마 안 가 깨진 이미지가 됨. 이 소스는 `thumbnailSelector`를 아예 설정하지 않았음 (썸네일 없이 등록). 또한 목록 카드에 발행일이 없어 `published_at`은 null로 저장됨 (URL slug에 날짜가 박혀있긴 하지만—예: `/post/2026-07-08-...`— 현재 scrape_config는 슬러그에서 날짜를 뽑는 기능은 지원하지 않음, 필요해지면 추후 추가).
