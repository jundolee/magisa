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

### 2026-07-30 — 소스 필터 드롭다운을 네이티브 `<select>`에서 SEED Design `FieldButton`+`Menu` 조합으로 교체
**결정**: 글 목록 상단의 소스 필터가 네이티브 `<select>`에 CSS 변수만 입혀둔 상태라 나머지 당근 UI(세그먼트 컨트롤 등)와 스타일이 겉돌았음. `npx @seed-design/cli@latest add ui:field-button ui:menu`로 두 컴포넌트를 설치해, 트리거는 `FieldButton`(선택된 소스명을 표시하는 디스플레이용 버튼), 팝오버 목록은 `MenuRoot`/`MenuAnchor`/`MenuContent`/`MenuGroup`/`MenuItem`으로 구성.
**구현 세부사항**: `MenuTrigger`(자체적으로 실제 `<button>`을 렌더링하는 인터랙티브 컴포넌트)를 `FieldButton`과 얽어 쓰는 대신, `MenuAnchor`(위치 참조용 non-interactive wrapper)로 `FieldButton`을 감싸고, `FieldButton`의 `buttonProps.onClick`으로 `MenuRoot`의 `open` 상태를 직접 토글하는 controlled 패턴을 택함 — 실제 라이브러리 소스(`@seed-design/react-field-button`, `@seed-design/react-menu`의 타입 정의와 번들 코드)를 직접 읽어, `MenuItem` 클릭 시 내부적으로 `setOpen(false, {reason:"itemClick"})`가 자동 호출되어 항목 선택 후 메뉴가 스스로 닫힌다는 것과 `onOpenChange`의 실제 시그니처(`(open: boolean, details?) => void`, 객체가 아니라 boolean 그대로)를 확인한 뒤 작성함 — SEED 공식 문서에는 FieldButton+Menu를 조합한 예시가 없어(WebFetch로 직접 확인, "dialog/picker" 패턴만 문서화됨) 라이브러리 타입 선언과 번들 소스를 근거로 삼음.
**크기**: 기존 세그먼트 컨트롤과 나란히 두기엔 `FieldButton` 기본 크기(`large`)가 다소 커서 `size="medium"`으로 조정.
**검증**: `npm run build`/`npm run lint` 통과 확인 + 로컬 dev 서버에서 렌더된 HTML을 직접 파싱해 (1) 기본 상태에 "전체 소스" 표시, (2) `?source=<id>` 쿼리로 접근 시 실제 소스명("MUSINSA techblog — 무신사 테크 블로그 - Medium")이 트리거에 정확히 표시되는지 확인. 브라우저 조작(클릭 열기/닫기, 키보드 내비게이션)까지는 별도 브라우저 자동화 도구가 없어 직접 확인하지 못함 — 라이브러리 소스 추적으로 동작을 간접 검증함.
**영향**: `src/components/source-filter-select.tsx`(전면 재작성, `{sources, current, onChange}` 컨트롤드 컴포넌트 계약은 유지해 `src/components/article-list.tsx`는 변경 없음), `seed-design/ui/field-button.tsx`/`seed-design/ui/menu.tsx`(신규, CLI 생성).

### 2026-07-30 — 스크래핑 자동 인식 실패 시 AI(OpenAI) 선택자 추론 폴백 추가
**결정**: 규칙 기반 auto-detect(`auto-detect-scrape-config.ts`)가 실패하는 사이트는 사용자가 직접 HTML을 열어 selector를 찾아 입력해야 했음 — 이 수공 비용을 줄이기 위해, auto-detect가 실패했을 때만(또는 결과가 0건일 때만) OpenAI API로 한 번 더 추론을 시도하는 폴백을 추가함.
**모델/비용**: `gpt-5-nano` (OpenAI 최저가 티어, $0.05/$0.40 per 1M input/output 토큰 — 공식 pricing 문서로 직접 확인). 소스 하나 등록할 때, 그것도 규칙 기반이 실패했을 때만 1회 호출되고, 이후 일일 수집(cron)은 저장된 `scrape_config`를 재사용할 뿐 AI를 다시 부르지 않음 — 사용량 자체가 매우 낮아 실사용 비용은 사실상 무시할 수준.
**입력 데이터**: 페이지를 다시 fetch한 뒤 `<script>/<style>/<svg>/<head>` 등을 cheerio로 제거하고 body HTML을 20,000자로 잘라 전달 — 토큰 비용을 더 줄임. Structured Outputs(`response_format: json_schema`, `strict: true`)로 스키마를 강제해 파싱 실패를 방지하고, 응답에 `found: boolean` 필드를 둬서 "반복되는 글 목록 자체가 없음(예: 빈 SPA 껍데기)"인 경우를 구분하도록 함 — 이 경로가 CSR(자바스크립트 렌더링) 사이트까지 해결해주진 않음(원본 HTML 자체에 내용이 없으면 AI도 볼 게 없음)을 명확히 인지하고 감.
**적용 우선순위**: (1) 사용자가 폼에 직접 selector를 입력 → 그대로 사용, (2) 규칙 기반 auto-detect 시도 → 성공하면 AI 호출 안 함(비용 0), (3) 그래도 0건이면 AI 추론 시도 → 그것도 실패하면 기존처럼 수동 입력 화면 노출.
**놓칠 뻔한 것**: AI가 `linkAttr`/`thumbnailAttr`(href/src가 아닌 다른 속성에서 URL을 읽어야 하는 경우)까지 추론해줄 수 있는데, 기존 수동 입력 폼에는 이 두 필드가 아예 없어서 `autoWorked`(자동 성공) 시 hidden input으로 다음 요청에 실어보내는 로직에도 빠져 있었음 — 그대로 뒀다면 미리보기는 성공해도 확정(confirm) 저장 시 이 값들이 조용히 유실될 뻔함. `add-source-form.tsx`의 hidden input과 `scrapeConfigFromFormData()` 양쪽에 추가해 방지.
**영향**: `src/lib/ingestion/ai-selector-inference.ts`(신규), `src/app/sources/actions.ts`(`addSourceFlowAction`의 스크래핑 분기를 후보별 순차 시도 구조로 재작성, `scrapeConfigFromFormData`에 `linkAttr`/`thumbnailAttr` 추가), `src/components/add-source-form.tsx`(hidden input 2개 추가), `.env.example`(`OPENAI_API_KEY` 추가, 비워두면 AI 폴백 없이 기존 그대로 동작).
**미검증**: 실제 `OPENAI_API_KEY`로 라이브 호출까지는 테스트하지 못함 — 모델명/구조화 출력 스키마 규칙은 OpenAI 공식 pricing/structured-outputs 문서로 직접 확인했지만, 실제 API 키를 넣고 자동 인식이 실패하던 사이트로 등록을 시도해 실제로 selector를 잘 추론하는지는 사용자가 키를 설정한 뒤 확인 필요.

### 2026-07-30 — Google Analytics(GA4) 태그 추가
**결정**: `@next/third-parties/google`의 `GoogleAnalytics` 컴포넌트를 루트 레이아웃에 추가(측정 ID `G-N87SEEKW9Y`). Next.js 공식 문서(`node_modules/next/dist/docs/01-app/02-guides/third-party-libraries.md`)에서 권장하는 방식 그대로 — 직접 `next/script`로 `gtag.js`를 붙이는 대신, hydration 이후 지연 로드 + 클라이언트 라우팅 시 자동 pageview 추적까지 함께 처리해줌.
**로컬 개발 트래픽 제외**: `process.env.NODE_ENV === "production"`일 때만 렌더링해 로컬 dev 접속이 GA 데이터에 섞이지 않도록 함. `npm run build` + `npm run start`로 실제 production 모드에서 `gtag.js` 프리로드가 정상 삽입되는지 확인함(`npm run dev`는 NODE_ENV가 development라 의도적으로 GA가 안 뜸 — 정상).
**영향**: `package.json`(`@next/third-parties` 추가), `src/app/layout.tsx`.

### 2026-07-30 — 읽음/안읽음을 전역 컬럼에서 방문자(브라우저)별 구분으로 전환
**배경**: 홈 화면(`/`)이 `/sources`와 달리 로그인/비밀번호 게이트가 없어 완전히 공개돼 있는데, `articles.is_read`가 테이블 전체에 딱 하나뿐인 전역 컬럼이라 누가 사이트에 들어오든 사용자님과 완전히 동일한 읽음 상태를 보고, 심지어 방문자가 글을 클릭하면 그 전역 상태 자체가 바뀌어버리는 문제가 있었음.
**결정**: 정식 로그인(Supabase Auth) 없이, 쿠키로 부여하는 익명 `visitor_id`(브라우저별) 기준으로 읽음 상태를 분리. `articles.is_read`/`read_at` 컬럼을 없애고, 대신 `read_status(visitor_id, article_id, read_at)` 테이블을 둬서 "이 방문자가 이 글을 읽었다"는 관계로 표현 — 읽음 처리는 `insert`(upsert), 안읽음 처리는 `delete`.
**구현**:
- `src/proxy.ts`: 관리자 게이트(`/sources`)와 별개로 `/`(홈)에도 적용 범위를 넓혀, 쿠키가 없는 첫 방문자에게 `crypto.randomUUID()`로 익명 `visitor_id`를 발급해 httpOnly 쿠키(2년)로 내려줌. 같은 요청의 RSC 렌더링에서도 바로 이 값을 쓸 수 있도록 `NextResponse.next({ request: { headers } })`로 요청 쿠키 헤더 자체에도 반영(Next.js 공식 문서의 "Setting Headers" 레시피 — 응답 쿠키만 설정하면 이번 요청이 아니라 다음 요청부터 반영됨).
- **기존 읽음 기록 보존**: 마이그레이션 시점에 전역 `is_read=true`였던 글들을 특수 `'__legacy__'` visitor_id로 스냅샷 저장해두고, 이후 신규 방문자가 최초 쿠키를 받을 때 이 스냅샷을 자신의 읽음 상태로 복사해 옴 — 결과적으로 이 배포 이후 가장 먼저 사이트를 여는 사람(대개 운영자 본인)이 기존 읽음 기록을 그대로 이어받고, 그 이후 방문자부터는 완전히 독립적으로 추적됨.
- `src/lib/data/articles.ts`: `listArticles(visitorId)`가 `articles`와 `read_status`(해당 visitor_id만) 두 번 조회해 클라이언트에는 기존과 동일한 `is_read: boolean` 필드로 합쳐서 내려줌 — `ArticleListItem`/`ArticleList`/`ArticleRow` 등 하위 컴포넌트는 전혀 손대지 않아도 됨. `markArticleRead`/`markArticleUnread`는 이제 `visitorId` 인자를 받아 `read_status` 행을 insert/delete.
- `src/app/articles/actions.ts`: Server Action 안에서 `cookies()`로 visitor_id를 읽음 — Server Component와 달리 Server Action은 이미 쿠키를 읽을 수 있어 별도 prop 전달 불필요.
**영향**: `supabase/migrations/0004_read_status.sql`(신규 — `read_status` 테이블 생성 + 레거시 스냅샷 백필 + `articles.is_read`/`read_at` 컬럼 삭제), `src/lib/visitor.ts`(신규, 쿠키 이름/레거시 ID 상수), `src/proxy.ts`, `src/lib/data/articles.ts`, `src/app/articles/actions.ts`, `src/app/page.tsx`.
**주의**: 이 마이그레이션은 컬럼을 삭제하는 되돌리기 어려운 변경이라, **배포 전에 반드시 먼저 Supabase에서 실행**해야 함 — 순서가 바뀌면(마이그레이션 전에 새 코드가 먼저 뜨면) `read_status` 테이블이 없어 홈 화면이 깨짐.

### 2026-07-30 — 신규 방문자는 항상 안읽음으로 시작 (레거시 스냅샷 시딩 제거)
**결정**: 방문자별 읽음 분리 배포 직후 "브라우저를 바꿔도 읽음/안읽음이 똑같다"는 피드백을 받아 확인해보니, 실제로는 `read_status` 격리 자체는 정상 동작(DB 레벨에서 직접 재현 테스트로 확인)했고, 두 브라우저 다 아직 서로 다르게 건드린 적이 없어서 마이그레이션 시점의 `'__legacy__'` 스냅샷이라는 동일한 출발점을 보고 있었을 뿐이었음. 이 자체가 "완전 신규 방문자는 모두 안읽음으로 시작해야 한다"는 사용자 기대와 어긋난다는 지적을 받아, `proxy.ts`의 레거시 스냅샷 복사 로직을 제거함 — 이제 쿠키가 없는 방문자는 예외 없이 빈 읽음 상태로 시작한다.
**트레이드오프**: 운영자 본인의 기존 읽음 기록(마이그레이션 전 전역 `is_read=true`였던 13개 글)도 함께 사라짐 — 명시적으로 받아들이기로 함.
**영향**: `src/proxy.ts`(`seedFromLegacySnapshot` 제거, `assignVisitorId`가 다시 동기 함수로 단순화), `src/lib/visitor.ts`(`LEGACY_VISITOR_ID` 상수 제거). DB의 `'__legacy__'` visitor_id 행들은 이제 아무 코드에서도 참조하지 않는 죽은 데이터로 남아있음(원하면 나중에 정리 가능).

### 2026-07-30 — 소스 관리 링크를 홈 화면에서 제거
**결정**: `/sources`는 이미 관리자 비밀번호로 막혀 있었지만, 홈 화면에 "소스 관리 →" 링크가 그대로 노출돼 있어 URL 존재 자체가 눈에 띄었음. `PageHeader`의 `navHref`/`navLabel`을 optional로 바꾸고, 홈 화면(`src/app/page.tsx`)에서는 아예 넘기지 않도록 해 링크 자체를 렌더링하지 않음 — 주소를 직접 아는 사람만 접근 가능. `/sources` 페이지 자체의 "글 목록 →" 백링크는 그대로 둠(이미 관리자 화면에 있는 사람에게는 노출돼도 문제없음).
**영향**: `src/components/page-header.tsx`, `src/app/page.tsx`.

### 2026-07-30 — SEO 기본 설정 (홈 인덱싱 허용 + robots/sitemap + OG/Twitter 메타)
**결정**: 그동안 루트 레이아웃에 `robots: { index: false, follow: false }`가 걸려 있어 사이트 전체가 검색엔진에서 제외돼 있었음. "혹시 모르니 SEO도 준비해두자"는 요청으로, 공개해도 되는 홈 화면은 인덱싱을 허용하고 관리자 화면만 명시적으로 막는 구조로 전환.
**구현**: 루트 레이아웃의 블랭킷 `noindex`를 제거하고 `metadataBase`/OpenGraph/Twitter 카드 메타 추가. 대신 `/sources`, `/admin-login` 페이지에 각각 `export const metadata = { robots: { index: false, follow: false } }`를 얹어 그 두 화면만 개별적으로 noindex. `app/robots.ts`(관리자 화면 Disallow + sitemap 경로 명시)와 `app/sitemap.ts`(공개 페이지가 홈 하나뿐이라 단순하게 유지) 추가.
**검증**: `next build && next start`로 실제 production 모드에서 홈에는 robots meta 태그가 없고(=인덱싱 허용), `/sources`에는 `<meta name="robots" content="noindex, nofollow">`가 정상적으로 붙는 것을 확인. `/robots.txt`/`/sitemap.xml` 응답 내용도 직접 curl로 확인.
**영향**: `src/app/layout.tsx`, `src/app/robots.ts`(신규), `src/app/sitemap.ts`(신규), `src/app/sources/page.tsx`, `src/app/admin-login/page.tsx`.

### 2026-07-30 — 전체 읽음/안읽음 처리 + 맨 위로 스크롤 버튼
**결정**: 글이 많아지면서 하나씩 읽음 처리하기 번거롭다는 요청으로 "전체 읽음"/"전체 안읽음" 버튼을 글 목록 상단(안읽음 배지 옆)에 추가. 방문자별 `read_status` 테이블 기준으로, 전체 읽음은 `articles` 전체 id를 대상으로 벌크 upsert, 전체 안읽음은 해당 visitor_id의 `read_status` 행을 통째로 delete. React 19의 `useTransition`으로 로딩 상태 표시.
**함께 추가**: 목록이 길어질 때를 위한 "맨 위로" 플로팅 버튼(`ScrollToTopButton`) — 400px 이상 스크롤했을 때만 나타나고 클릭 시 부드럽게 최상단으로 이동.
**검증**: 실제 프로덕션 DB(글 267개)에 대해 전체 읽음 upsert → 267건 반영, 전체 안읽음 delete → 0건으로 복귀하는 것을 직접 스크립트로 재현 확인.
**영향**: `src/lib/data/articles.ts`(`markAllArticlesRead`/`markAllArticlesUnread` 추가), `src/app/articles/actions.ts`(대응 서버 액션 추가), `src/components/read-all-controls.tsx`(신규), `src/components/scroll-to-top-button.tsx`(신규), `src/components/article-list.tsx`.

### 2026-07-30 — 이미지 lazy loading 적용 (React 19 자동 preload를 무력화하고 있었음을 확인 후 수정)
**결정**: 글 목록 썸네일/파비콘 `<img>`에 `loading="lazy"`/`decoding="async"`를 추가해 화면 밖 이미지는 스크롤 전까지 받아오지 않도록 함.
**중요한 발견**: 단순히 속성만 추가하고 끝내지 않고 실제 렌더된 HTML을 직접 비교해봄 — 적용 **전**에는 React 19가 SSR 중 렌더된 모든 `<img>`를 자동으로 `<link rel="preload" as="image">`로 `<head>`에 미리 박아두고 있었음(글 185개 기준 185개 preload 태그, 즉 화면에 보이지도 않는 이미지까지 페이지 로드와 동시에 전부 프리로드). `loading="lazy"`를 추가하니 이 자동 preload가 정확히 0개로 사라지는 것을 확인 — 즉 이 속성 하나가 없으면 아무리 `<img>`에 lazy를 걸어도 React가 이미 선제적으로 fetch를 걸어놔서 사실상 무의미했을 것이라는 얘기. 이걸 확인하지 않고 넘어갔으면 "적용은 했는데 실제로는 효과가 없는" 상태로 남을 뻔함.
**한계**: 이 환경엔 실제 브라우저/Lighthouse가 없어 LCP·총 전송량 등 체감 지표까지는 측정하지 못함 — preload 태그 개수(185→0)로 메커니즘이 정상 작동함만 확인.
**영향**: `src/components/article-row.tsx`.

### 2026-07-30 — 썸네일 없는 글도 동일 규격의 플레이스홀더로 채워 목록 정렬 통일
**배경**: 썸네일 크기 고정(112x112)과 `object-fit: cover`는 이미 `AspectRatio`로 구현돼 있었지만(`--seed-aspect-ratio-padding`이 padding-bottom 트릭으로 정사각형을 만들고, `.seed-aspect-ratio > img`가 `object-fit: cover`를 강제), `thumbnail_url`이 없는 글(예: bucketplace.com처럼 처음부터 썸네일 셀렉터를 설정 안 한 소스)은 그 자리 자체를 아예 렌더링하지 않아 목록 전체를 봤을 때 정렬이 어긋나 보였음.
**결정**: `thumbnail_url` 유무와 무관하게 항상 같은 112x112 `AspectRatio` 박스를 렌더링하도록 바꾸고, 없을 때는 `--seed-color-bg-neutral-weak` 배경의 빈 플레이스홀더 div로 채움.
**검증**: production 빌드로 실제 글 200개(캡 기준) 목록을 렌더링해, 썸네일 있는 196개는 `<img>`로, 없는 4개는 플레이스홀더 div로 — 정확히 200개 모두 하나씩 박스를 갖는 것을 확인.
**영향**: `src/components/article-row.tsx`.

### 2026-07-30 — 소스 필터 드롭다운 위치/너비 조정 + 썸네일·본문 전체 클릭 가능하게
**결정**:
- 필터 탭(세그먼트 컨트롤)과 소스 드롭다운이 같은 줄에 붙어 있어 드롭다운이 토글 바로 옆이라 답답하다는 피드백 → `justify-content: space-between`으로 좌우 분리(`src/components/article-list.tsx`).
- 드롭다운 메뉴 항목 텍스트가 두 줄로 잘려 보이던 문제 → 원인은 `MenuRoot`에 걸어둔 `matchReferenceWidth`가 트리거 버튼의 좁은 너비(160px)를 메뉴 팝오버 너비에 그대로 강제하고 있었음. `matchReferenceWidth` 제거 + `MenuContent`에 `minWidth:240/maxWidth:320` 지정 + 각 항목 라벨에 `white-space:nowrap`+`text-overflow:ellipsis`(+flex 자식 축소를 위한 `minWidth:0`)를 줘서 짧은 이름은 한 줄로, 아주 긴 이름은 말줄임표로 처리되도록 함(`src/components/source-filter-select.tsx`).
- 지금까지 글 제목만 클릭 가능했는데, 썸네일과 요약/날짜도 클릭해서 원문으로 이동하도록 확장. `ArticleLink`에 `style` prop을 추가해 제목+요약+날짜를 하나의 링크로 묶고, 썸네일은 별도의 `ArticleLink`로 감쌈(안읽음 처리 폼/배지는 링크 밖에 그대로 둬 `<a>` 안에 `<form>`이 중첩되는 문제를 피함).
**영향**: `src/components/article-list.tsx`, `src/components/source-filter-select.tsx`, `src/components/article-link.tsx`(style prop 추가), `src/components/article-row.tsx`.

### 2026-07-30 — 힐링페이퍼 블로그(강남언니) 스크래핑: excerpt에 작성자명+날짜가 뒤섞여 저장되던 버그
**원인**: 등록 당시 `excerptSelector`로 잡아둔 `.typo-description1`은 실제로는 "요약문"이 아니라 작성자 여러 명 + 구분점 + `<time>` 날짜를 한 줄에 나열하는 **바이라인(byline) 컨테이너**였음. `scrapeSource()`가 이 엘리먼트에 `.text()`를 호출하면 내부의 모든 텍스트 노드(작성자명들 + 날짜)가 공백 없이 그대로 이어붙어(`"이수빈이혜수신승훈김필섭2026. 7. 14."`) `excerpt` 컬럼에 저장되고 있었음 — 사용자가 보고한 "날짜랑 이름이 같이 딸려온다"는 증상과 정확히 일치.
**조치**: 실제 페이지 HTML을 직접 fetch해 구조를 확인한 뒤 (1) 해당 소스의 `scrape_config`에서 `excerptSelector`를 제거(이 사이트 목록 뷰에는 애초에 실제 요약 텍스트가 없음 — title + byline + 썸네일만 존재), (2) 이미 잘못 저장된 기존 글 95건의 `excerpt`를 전부 `null`로 정리. 수정된 설정으로 실제 스크래핑을 재현해 제목/날짜가 오염 없이 정상 추출되는 것까지 확인.
**영향**: DB 데이터만 수정(코드 변경 없음) — `sources.scrape_config`(id: `d063aeca-a22f-44a8-88da-c9a78b26b61c`), `articles.excerpt`(해당 소스 95건).

### 2026-07-30 — 글 클릭수(전역 카운터) 추가
**결정**: 읽음/안읽음과 달리 클릭수는 "모든 유저에게 공통으로 보이는" 값이라고 명시적으로 요청받아, 방문자별 `read_status`와 분리해 `articles.click_count`에 그대로 전역 컬럼으로 둠. 글 목록에 날짜 옆 "클릭수 : N" 형태로 표시.
**구현**: 제목/요약/썸네일 어디를 클릭하든 이미 `markArticleReadAction`이 호출되고 있어서(같은 `ArticleLink`), 여기에 증가 로직을 얹음 — 읽음 처리(방문자별)와 달리 방문자 쿠키가 없어도 클릭수는 항상 증가하도록 분리 처리. 동시 클릭 시 `column = column + 1` 형태의 원자적 증가가 필요해서(supabase-js는 이런 산술 업데이트를 직접 지원하지 않음) `increment_article_click_count(target_id uuid)` Postgres 함수를 만들어 RPC로 호출.
**영향**: `supabase/migrations/0005_article_click_count.sql`(신규 — 컬럼 추가는 기존 행에 영향 없는 안전한 additive 마이그레이션이지만, 코드가 먼저 배포되면 `listArticles()`의 select가 없는 컬럼을 찾다 실패하므로 **마이그레이션을 먼저 실행해야 함** — favicon_url 때와 동일한 패턴), `src/lib/data/articles.ts`(`incrementArticleClickCount`, `ArticleListItem.click_count`), `src/app/articles/actions.ts`, `src/components/article-row.tsx`.

### 2026-07-30 — "LLM으로 스크래핑을 못한다" 문제의 실제 원인: 빈 RSS 피드가 스크래핑/AI 폴백 자체를 막고 있었음
**배경**: `tech.imweb.me`, `tech.kakaopay.com` 두 사이트를 실제 코드로 재현 확인.
- `tech.imweb.me`는 RSS 피드가 정상 존재하고 20건이 그대로 잘 파싱됨 — 이 사이트는 원래도 스크래핑/AI가 필요 없는 케이스였음(썸네일이 없는 건 원본 피드 자체에 이미지 데이터가 없어서였고 버그 아님).
- `tech.kakaopay.com`은 `discoverFeed()`가 `/rss.xml`을 찾긴 하지만, 그 피드 자체가 `<channel><title>...</title></channel>`만 있고 `<item>`이 하나도 없는 빈 스텁이었음. 그런데 기존 `addSourceFlowAction`은 `feedType`이 rss/atom이면 파싱 결과 글이 0개여도 그대로 반환해버려서(`preview.length===0`이라 등록 버튼도 안 뜸), **스크래핑도 AI 추론도 아예 시도되지 않고 거기서 끝나버리는 구조**였음. 사용자가 "LLM이 스크래핑을 못 한다"고 느낀 실제 원인은 이거였음 — LLM이 실패한 게 아니라 애초에 호출된 적이 없었음.
**수정**: RSS/Atom을 찾았어도 파싱 결과가 0건이면 그 자리에서 끝내지 않고, 기존의 "RSS 못 찾음" 폴백 경로(사용자 수동 입력 → 규칙 기반 auto-detect → AI 추론)로 그대로 흘러가도록 변경.
**kakaopay 추가 조사**: 수정 후에도 규칙 기반 auto-detect는 이 사이트에서 실패함 — 실제 원인은 태그 알약(`<a class="tag">BE</a>` 등, 9개, 서로 다른 텍스트라 다양성 체크 통과)이 진짜 글 목록(`li._postListItem_...`, CSS 모듈 해시 클래스명, 5개)보다 "적합 개수"가 더 많아서 휴리스틱이 잘못된 후보를 고르고, 그 후보엔 제목 삼을 만한 게 없어(`<a class="tag">BE</a>`는 자식 엘리먼트가 아예 없음) 최종적으로 실패로 끝남. Astro 등 빌드 도구가 만드는 해시 클래스명(`_postListItem_1169t_66`)은 애초에 규칙 기반 키워드 매칭("title", "desc" 등)으로 잡을 수 없는 구조라, 이런 사이트는 AI 추론 폴백에 의존해야 함 — `OPENAI_API_KEY`가 Vercel에 설정되어 있어야 실제로 동작.
**영향**: `src/app/sources/actions.ts`(RSS 분기에서 0건이면 폴백으로 계속 진행하도록 수정).

### 2026-07-30 — AI 선택자 추론이 실제로는 매번 타임아웃되고 있던 진짜 원인: `gpt-5-nano`의 기본 reasoning 토큰
**배경**: OPENAI_API_KEY를 설정한 뒤에도 `tech.kakaopay.com`이 계속 "새 글 목록을 자동으로 찾지 못했어요"로 끝남 — AI 폴백까지 도달은 하는데 매번 실패.
**원인**: 로컬에 `OPENAI_API_KEY`를 받아 실제로 재현해보니, 우리가 쓰는 `gpt-5-nano`는 기본적으로 상당량의 **내부 reasoning 토큰**을 쓰는 모델이었음 — 아주 단순한 "ok라고만 답해"에도 202 completion 토큰 중 192개가 reasoning 토큰으로 소모됐고(실측), 우리 프롬프트(최대 20,000자 HTML + JSON 스키마 강제)에서는 이게 `AI_TIMEOUT_MS`(30초)를 넘겨 매번 `DOMException [TimeoutError]`로 끝나고 있었음. 즉 LLM이 틀린 답을 낸 게 아니라 **응답이 오기도 전에 타임아웃으로 끊기고 있었음**.
**수정**: 요청에 `reasoning_effort: "minimal"` 추가. 같은 테스트 프롬프트로 재측정하니 reasoning 토큰 0, 응답 시간이 수십 초에서 약 2~3초로 단축됨 — 이 정도 선택자 추출 작업에는 깊은 추론이 필요 없어 품질 저하 없이 지연시간·비용 모두 줄어듦.
**추가로 발견한 것**: reasoning_effort 수정 후 실제로 호출은 되지만, 복잡하게 중첩된 DOM(예: `li._postListItem_1169t_66` 안에 `<a>`가 들어있는데, `div._postList_1169t_34 > a`처럼 실제 구조와 다르게 짐작)에서 모델이 존재하지 않는 selector를 만들어내는 경우가 있었음(실측으로 확인, 결과 0건). 그래서 응답을 그대로 믿지 않고 **원본 페이지에 실제로 매칭되는지(cheerio로 listItemSelector/titleSelector 검증) 확인 후, 실패하면 그 사실을 알려주고 한 번 더 시도**하는 재검증 루프를 추가함 (최대 2회 호출, 실패해도 여전히 저렴).
**영향**: `src/lib/ingestion/ai-selector-inference.ts`(`reasoning_effort` 추가, `validatesAgainstPage()`/`callModel()` 분리 + 실패 시 피드백을 포함한 재시도 로직 추가). 실제 `OPENAI_API_KEY`로 `tech.kakaopay.com`을 대상으로 재현 테스트해 2~3초 내 정상적으로 3개 글(제목/링크/썸네일 포함)을 스크래핑하는 것까지 확인함.

### 2026-08-06 — 모바일에서 글 카드의 블로그 이름 배지가 말줄임표 없이 중간에서 끊기던 버그 수정
**배경**: 모바일 레이아웃 수정(헤더/필터 탭/소스 카드) 이후 사용자가 실제 모바일 화면에서 "가독성이 안 좋고 레이아웃이 계속 바뀐다"고 지적함. 브라우저 창 리사이즈가 이 환경에서 실제 뷰포트에 반영되지 않아(`resize_window`가 성공을 반환해도 `window.innerWidth`가 그대로였음), `<iframe>`을 페이지에 동적으로 주입해 원하는 CSS 너비를 강제하는 방식으로 우회해 실제 375px/390px/320px 렌더링을 검증함 — 이 방법이 앞으로도 유효한 모바일 QA 우회 수단.
**원인**: `ArticleRow`가 블로그 이름 배지(SEED `Badge`) 안에 파비콘과 이름을 `<span style={{display:"inline-flex", ...}}>`로 함께 묶어 넣었음. SEED Badge는 내부적으로 라벨을 순수 텍스트로 가정해 그래프킴 기반으로 고정 px 너비를 계산하고 `overflow:hidden`+`text-overflow:ellipsis`를 적용하는데, 그 계산된 너비(예: 108px)가 우리가 넣은 `inline-flex` 래퍼의 실제 콘텐츠 너비(예: 123.7px)보다 좁을 때 — CSS의 `text-overflow:ellipsis`는 오버플로하는 대상이 순수 인라인 텍스트일 때만 "…"를 그려주고, 중첩된 flex 박스가 넘칠 때는 그냥 하드 클리핑만 일어난다는 점 때문에 "…" 없이 "여기어때 기술블로그 - Medi"처럼 글자가 뚝 끊기고 있었음. 이름 길이가 소스마다 달라 카드마다 서로 다르게(혹은 전혀 안) 끊기는 것이 "레이아웃이 계속 바뀐다"는 인상을 준 것으로 보임.
**수정**: 파비콘+이름 래퍼에 `maxWidth:"100%", minWidth:0`을 줘 Badge가 계산한 라벨 너비를 그대로 따르게 하고, 이름 텍스트만 감싸는 안쪽 `<span>`에 `overflow:hidden, textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0`을 직접 줘서 — 잘리는 지점이 항상 순수 텍스트 노드가 되도록 구조를 바꿈. 실제 프로덕션 빌드(`next build && next start`, 별도 포트)를 375px 폭 iframe으로 재현해 "원티드랩 기술블로그 …" 등 여러 카드에서 "…"가 일관되게 나타나는 것을 확인.
**영향**: `src/components/article-row.tsx`.

### 2026-08-10 — 초기 로딩 단축: 소스 목록 캐시 추가 + 상단 썸네일만 lazy 해제
**배경**: 사용자가 홈 화면 초기 로딩이 느리다고 지적. 글 목록(`getCachedArticleFeed`)은 이미 60초 `unstable_cache`가 걸려 있었지만, 같은 화면에서 `Promise.all`로 나란히 조회하는 `listSources()`(소스 필터 드롭다운용)는 캐시가 없어 매 방문마다 Supabase 왕복이 그대로 하한선이 되고 있었음. 또한 글 목록의 모든 썸네일에 `loading="lazy"`가 걸려 있어(2026-07-30 결정: 오프스크린 이미지 프리로드 제거 목적), 화면에 바로 보이는 상단 이미지까지도 브라우저가 뷰포트 진입을 확인한 뒤에야 fetch를 시작해 체감 로딩이 늦어질 수 있었음.
**수정**:
1. `listSources()`도 `getCachedArticleFeed`와 같은 패턴으로 `unstable_cache(..., { revalidate: 60, tags: ["sources"] })`로 감쌈.
2. `ArticleRow`에 `priority` prop을 추가해 목록의 처음 3개(`ArticleList`에서 `index < 3`)만 썸네일을 `loading="eager"` + `fetchPriority="high"`로, 나머지는 그대로 `loading="lazy"`로 유지.
**소스 캐시와 `revalidateTag`/`updateTag`**: `AGENTS.md`가 경고한 대로 이 Next.js 버전(16.2.12)은 훈련 데이터와 다르다 — 번들된 문서(`node_modules/next/dist/docs/.../revalidateTag.md`, `updateTag.md`)를 확인해보니 `revalidateTag(tag)` 단일 인자 형태는 deprecated이고, 이제 `revalidateTag(tag, profile)`처럼 두 번째 인자(`"max"` 등, stale-while-revalidate)가 필요하며, "read-your-own-writes"(사용자가 방금 바꾼 걸 바로 봐야 하는 경우)에는 Server Action 전용의 `updateTag(tag)`를 쓰라고 명시돼 있었음. 소스 등록/삭제/일시중지는 전부 Server Action이고 관리자가 자기 변경을 바로 보고 싶은 경우라 `updateTag("sources")`를 채택 — `addSourceFlowAction`(confirm), `addSourcesBulkAction`, `toggleSourceActiveAction`, `deleteSourceAction`, `ingestSourceNowAction`(성공/실패 모두) 각각의 기존 `revalidatePath("/sources")` 옆에 추가함.
**검증**: `next build`/`next start`(별도 포트)로 프로덕션 모드에서 렌더된 HTML을 직접 확인 — 목록 전체 중 정확히 3개의 `<img>`만 `loading="eager" fetchPriority="high"`이고 나머지 46개는 `loading="lazy"`. `/sources`도 캐시된 `listSources()`로 정상 렌더링됨을 확인. 실제 소스 추가/삭제로 캐시 무효화까지는(운영 DB에 영향 주는 작업이라) 재현하지 않았고, 코드 경로상 `insertSource`/`deleteSource`/`setSourceActive` 직후 `updateTag("sources")`가 호출되는 것만 확인.
**영향**: `src/lib/data/sources.ts`, `src/app/sources/actions.ts`, `src/components/article-row.tsx`, `src/components/article-list.tsx`.

### 2026-08-10 — Amplitude(제품 분석) 추가
**결정**: 사용자가 이미 만들어둔 Amplitude 프로젝트에 이벤트를 보내도록 `@amplitude/analytics-browser`를 설치. GA4(Google Tag Manager)와 동일한 패턴 — `src/components/amplitude-analytics.tsx`("use client", `useEffect` 안에서 `amplitude.init(apiKey, { autocapture: true })`)를 만들고, `layout.tsx`에서 GTM과 같은 조건(`process.env.NODE_ENV === "production"`)으로만 렌더링해 로컬 개발 접속이 실제 분석 데이터에 섞이지 않게 함.
**키 관리**: API 키는 `NEXT_PUBLIC_AMPLITUDE_API_KEY` 환경변수로 `.env.local`/`.env.example`에 추가. Amplitude 브라우저 SDK 키는 GA 측정 ID처럼 클라이언트 번들에 노출되는 게 원래 설계라 민감정보는 아니지만, GA4와 일관성 있게 관리하려고 env var로 뺌. **Vercel에도 같은 환경변수를 등록해야 배포 환경에서 동작함** (아직 안 함).
**검증**: `next build && next start`(별도 포트) 후 실제 브라우저로 접속해 네트워크 요청을 확인 — `api2.amplitude.com/2/httpapi`(이벤트 전송)와 `sr-client-cfg.amplitude.com`(설정 조회) 요청이 실제 API 키로 200 OK 응답 받는 것까지 확인함(실제 Amplitude 프로젝트에 이벤트가 들어감).
**영향**: `src/components/amplitude-analytics.tsx`(신규), `src/app/layout.tsx`, `package.json`(`@amplitude/analytics-browser` 추가), `.env.local`/`.env.example`.

### 2026-08-10 — 홈 화면 초기 로딩이 느린 진짜 원인: Vercel 서버리스 함수 리전(iad1, 미국)이 사용자와 멀었음
**배경**: 사용자가 "로딩이 느리다, 스켈레톤이라도 먼저 보여줄 수 없냐"고 물어봄. 코드를 보면 스켈레톤 우선 표시(`Suspense` + `ArticleListSkeleton`, 2026-07-30 이전 결정)는 이미 구현돼 있어서, 진짜 원인을 실제 배포 사이트(`magisa.vercel.app`)에 직접 요청을 보내 확인함.
**진단**: 실제 프로덕션 응답 헤더의 `X-Vercel-Id: icn1::iad1::...`를 보면, 요청은 인천(한국) 엣지로 들어오지만 Next.js 서버 함수 자체는 **iad1(미국 버지니아)**에서 실행되고 있었음. 반면 Supabase는 한국(Cloudflare `CF-RAY ...-ICN`)에서 0.35초로 훨씬 빠르게 응답함. 그 결과 매 요청이 한국↔버지니아를 왕복하며 TTFB가 **~1.5초**로 측정됨 — 로컬에서 캐시가 warm할 때 앱 로직 자체는 0.03~0.2초 수준이었던 것과 비교하면, 병목은 앱 코드가 아니라 순수 네트워크 왕복 거리였음.
**결정**: Vercel에서 서버리스 함수 리전은 Node.js 런타임에서는 Next.js 설정으로 바꿀 수 없고(번들된 문서 `preferredRegion.md`: "regions are only supported if `runtime = 'edge'` is set"), Edge Runtime에서만 `preferredRegion`을 지정할 수 있음 — 그것도 임의의 리전 코드가 아니라 `'auto' | 'global' | 'home'` 중 하나만 허용됨(커스텀 리전 코드를 주면 에러). 홈 화면(`src/app/page.tsx`)에 `export const runtime = "edge"`와 `export const preferredRegion = "global"`을 추가해, 방문자와 가장 가까운 Vercel 엣지(한국 방문자는 icn1)에서 직접 실행되도록 바꿈 — Vercel Pro 이상이 필요한 "리전 고정" 방식과 달리 Edge Function은 Hobby(무료) 플랜에서도 전세계 엣지에서 실행됨.
**Edge Runtime 호환성 확인**: 이 프로젝트는 실험적 "Cache Components"(`next.config.ts`의 `cacheComponents: true`)를 켜지 않은 상태라 `runtime.md`의 "Cache Components에서는 edge 미지원" 경고는 해당 없음(둘은 독립된 기능). `next build`가 별다른 에러 없이 통과했고, 빌드 산출물(`.next/server/middleware-manifest.json`)의 `/page` 항목에 `"regions":["global"]`와 edge 전용 엔트리포인트(`server/edge/chunks/ssr/...edge-wrapper...`)가 실제로 생성된 것을 확인함 — `listArticles`/`listSources`(Supabase 클라이언트), `cookies()`, `unstable_cache`가 모두 Edge Runtime에서 정상적으로 컴파일됨.
**범위**: `/sources`와 그 서버 액션(치어리오 스크래핑, RSS 파싱, OpenAI 호출, Supabase Storage 이미지 업로드)은 Node.js 전용 API에 의존해 Edge로 옮기지 않고 그대로 둠 — 라우트 세그먼트별로 런타임을 독립적으로 지정할 수 있어(자식이 부모 설정을 덮어씀) 홈 화면만 골라서 바꿀 수 있었음.
**한계**: 로컬 `next start`는 Edge Runtime을 에뮬레이션해서 기능적으로는 정상 동작(200 응답, 실제 컨텐츠 렌더링)까지만 확인했고, 실제 리전 라우팅(진짜로 icn1에서 실행되는지, TTFB가 실제로 줄어드는지)은 배포 후 프로덕션에서 다시 측정해야 확인 가능.
**영향**: `src/app/page.tsx`.

### 2026-08-10 — 소스 필터 드롭다운에서 특정 소스명이 ellipsis 없이 메뉴 밖으로 넘쳐 가로 스크롤이 생기던 버그
**배경**: 사용자가 "모바일에서 레이아웃이 계속 어긋난다"고 재차 지적. iframe으로 여러 폭(320~428px)을 강제해 재현한 결과, 글 목록/헤더/소스 카드(2026-08-06에 고친 부분들)는 모두 정상이었지만, 소스 필터 드롭다운(`SourceFilterSelect`, 2026-07-30에 FieldButton+Menu로 교체한 것)을 열었을 때 특정 소스명 2개("마이리얼트립 블로그 | Myrealtrip Blog", "MUSINSA techblog — 무신사 테크 블로그 - Medium")가 메뉴 폭을 넘어가면서 메뉴 안에 원치 않는 **가로 스크롤바**가 생기는 걸 발견함.
**원인**: 각 항목의 라벨에 `overflow:hidden, textOverflow:ellipsis, whiteSpace:nowrap`과 함께 `maxWidth:"100%"`를 주고 있었는데, 이 100%가 기준으로 삼는 부모(SEED의 `.seed-menu-item__label`)가 특정 텍스트(길이나 특수문자 조합에 따라)에서 자기 자신의 폭을 content 기준으로 잘못 계산해버리면, 그 불안정한 값의 100%를 물려받은 우리 라벨도 함께 무너져 ellipsis가 전혀 적용되지 않고 원래 텍스트 길이만큼 그려짐. 짧거나 "평범한" 조합의 소스명은 부모가 항상 정확히 193px로 계산돼 멀쩭했지만, 이 2개 소스명에서만 부모가 222px/313px로 잘못 계산됨 — SEED Badge에서 겪었던(2026-08-06) "SEED 내부 폭 계산이 특정 콘텐츠에서 어긋난다"는 같은 계열의 문제.
**수정**: `maxWidth: "100%"`를 부모 크기와 무관한 고정 값 `maxWidth: 190`(px)으로 바꿔, SEED 쪽 부모가 무엇을 계산하든 우리 라벨은 항상 같은 절대 폭에서 잘리도록 함.
**검증**: 프로덕션 빌드를 iframe으로 320/375/414/428px 각각 강제해, 메뉴를 열고 전체 30개 항목(전체 소스 포함)의 `scrollWidth > clientWidth`를 전부 스크립트로 검사 — 전 폭에서 `overflowingCount: 0`. 메뉴 스크롤 영역 자체의 `scrollWidth === clientWidth`(가로 스크롤 완전히 사라짐)까지 확인.
**영향**: `src/components/source-filter-select.tsx`.

### 2026-08-10 — 검색창을 펼치면 레이아웃이 크게 밀리던 문제: 배지/버튼을 그 줄에서 숨김
**배경**: 사용자가 위 드롭다운 수정 이후에도 "돋보기 버튼 클릭하면 레이아웃이 다 이동돼"라고 재차 지적. 실제 배포 사이트(magisa.vercel.app)를 iframe으로 360px 폭 강제해 검색 버튼 클릭 전/후를 직접 비교한 결과, 검색창(고정 240px, `flexShrink:0`)이 펼쳐지면서 같은 줄의 배지("안읽음 N")·"전체읽음"·"전체안읽음" 버튼과 함께 한 줄에 다 안 들어가, 그룹 전체가 제목 아래로 줄바꿈되고 그 그룹 **안에서도** 검색창과 버튼들이 서로 다른 지점에서 또 줄바꿈되는 이중 줄바꿈이 발생 — 헤더가 약 3줄에서 6줄로 늘어나며 그 아래 필터탭/글목록이 70px 이상 크게 밀려남. 가로 스크롤은 없었지만(이전 수정으로 이미 해소됨), 수직으로 크게 "덜컹거리는" 게 실제 문제였음.
**수정**: `ExpandableSearch`의 펼침 상태(`expanded`)를 컴포넌트 내부 state에서 부모(`ArticleList`)로 끌어올려 controlled로 바꿈. 펼쳐진 동안은 같은 줄의 배지/`ReadAllControls`를 아예 숨기고, 검색창을 담은 그룹에 `flexBasis:"100%"`를 줘서 그 줄을 검색창 하나가 통째로 차지하게 함 — 여러 요소가 각자 다른 지점에서 줄바꿈되는 대신, "제목 한 줄 + 검색창 한 줄"의 예측 가능한 한 단계 줄바꿈만 일어나게 함. 검색창 자체의 너비도 고정 240px 대신 그 줄의 100%로 바꿔 화면 폭에 자연스럽게 맞춤.
**검증**: 로컬 프로덕션 빌드를 320/360px iframe으로 재현 — 검색 펼침 전/후 스크린샷 비교로 필터탭이 약 35px만 이동(이전 70px+ 대비)하는 예측 가능한 한 단계 변화만 있음을 확인, `document.documentElement.scrollWidth`도 두 폭 모두 overflow 없음. 펼침→검색어 없이 바깥 클릭→접힘까지 왕복해 배지/버튼이 정상 복원되는 것도 확인.
**영향**: `src/components/expandable-search.tsx`, `src/components/article-list.tsx`.

### 2026-08-11 — scrape 소스 3개가 12일째 새 글이 없다는 문의: 정상 동작 확인 (블로그 자체가 조용했음)
**배경**: 사용자가 "아침마다 수집하는 scrape가 안 되는 것 같다"고 문의. 4개 scrape 소스(오늘의집/힐링페이퍼/카카오페이/사색숭어) 각각의 실제 사이트를 지금 다시 직접 긁어와(cheerio + 저장된 scrape_config 그대로) 현재 최신 글이 DB에 있는지 대조함.
**결론**: 스크래핑 자체는 정상 동작 — 4개 사이트의 selector가 여전히 콘텐츠를 정확히 찾아냄. 오늘의집은 8/7에도 새 글이 수집됐고, 힐링페이퍼/카카오페이는 사이트에 지금 보이는 최신 글(제목·URL 일치 확인)이 이미 7/30에 수집돼 있었으며, 사색숭어는 사이트 자체 표기 최신 발행일이 7월 19일 — 세 블로그 모두 그 이후로 실제로 새 글을 안 올린 것으로 확인됨. 크론이 매일 "성공"으로 기록하면서 inserted:0인 게 선택자가 깨진 게 아니라 정확한 "새 글 없음" 판단이었음.
**추가 문의**: 사용자가 `/sources`의 "마지막 확인" 날짜가 과거로 보인다고 했었는데, 확인해보니 그날 크론(당시 스케줄 기준 06:00 KST)이 아직 안 돈 시점에 봐서 어제 날짜가 남아있던 것 — 이후 재확인 시 갱신됨. 버그 아님.
**영향**: 없음(코드 변경 없음) — 조사만 수행.

### 2026-08-11 — 일일 수집 크론 시각을 오전 6시에서 오전 8시(KST)로 변경
**결정**: `vercel.json`의 크론 스케줄을 `"0 21 * * *"`(21:00 UTC = 06:00 KST)에서 `"0 23 * * *"`(23:00 UTC = 08:00 KST)로 변경.
**이유**: 사용자 요청 — 아침에 더 늦게 확인하는 패턴에 맞춤.
**영향**: `vercel.json`. Vercel Cron 스케줄은 UTC 기준이며 배포가 반영돼야 새 스케줄이 적용됨.

### 2026-08-11 — 모바일 가로 스크롤 재발 3건: 필터 탭은 근본 수정, 검색/드롭다운은 기존 수정이 유효함을 재확인
**배경**: 사용자가 이전 수정들 이후에도 "①글 필터 탭에 가로 스크롤, ②검색 열기 시 레이아웃이 다 어그러짐, ③소스 드롭다운도 가로 스크롤/어색함"을 재차 지적.
**① 필터 탭(진짜 문제, 새로 발견)**: `ArticleFilterTabs`(전체/안읽음/읽음/즐겨찾기 4개)를 감싸던 `overflow-x:auto` 래퍼가 "가로 스크롤로라도 다 보이게"라는 기존 의도로 만든 것이었는데, 이번엔 그 스크롤 자체가 문제로 지적됨. 원인은 두 겹: (1) SEED `.seed-segmented-control__item`의 기본 `padding-inline: 24px`(양쪽 48px)가 4개 항목에 396px를 요구해 320~390px 화면에 항상 넘쳤음. (2) 우리가 만든 `overflow-x:auto` 래퍼 자체가 flexbox의 "overflow가 visible이 아니면 자동 최소크기가 0"이라는 규칙에 걸려, 부모 행(소스 드롭다운과 같은 줄)이 이 항목을 줄바꿈시키는 대신 계속 찌그러뜨려 왔음. `paddingInline`을 10px로 줄이고(4개 396px→284px로), `overflow-x:auto`/`width:max-content` 래퍼를 완전히 제거해 일반 flex 아이템(`flexShrink:0`)으로 바꿔 — 다 안 들어가면 소스 드롭다운과 같은 줄에 억지로 끼우지 않고 그 줄 전체를 통째로 다음 줄로 넘기게 함(검색창 수정과 같은 패턴).
**② 검색 열기 / ③ 소스 드롭다운**: 각각 2026-08-10/2026-08-10 결정으로 이미 고친 부분 — 로컬 프로덕션 빌드를 320~428px(320/344/360/375/390/393/412/414/428) 전부 iframe으로 재현해 재검증했으나 페이지 레벨 가로 스크롤(`document.documentElement.scrollWidth > clientWidth`)이 어떤 폭에서도 발생하지 않음을 재확인함 — 즉 이 두 가지는 코드 상으로는 이미 정상이며, 이번엔 추가로 손댈 지점을 찾지 못함.
**한계**: 이 환경은 실제 모바일 기기가 아니라 데스크톱 Chrome에 iframe으로 폭을 강제하는 방식이라, 실제 기기의 폰트 렌더링/터치 키보드 뷰포트 변화 등 여기서 재현 못 하는 차이가 있을 수 있음 — ②③이 실제 기기에서도 계속 보인다면 스크린샷 등 추가 정보가 필요함.
**영향**: `src/components/article-filter-tabs.tsx`, `src/components/article-list.tsx`.

### 2026-08-11 — 스크래핑 선택자 추론 순서를 "규칙 기반 → AI"에서 "AI → 규칙 기반"으로 변경
**결정**: 사용자 요청으로 `addSourceFlowAction`의 스크래핑 폴백 순서를 뒤집음 — 이제 RSS/Atom이 없으면 먼저 AI(gpt-5-nano)로 선택자를 추론하고, AI가 실패했을 때(또는 `OPENAI_API_KEY` 미설정 시, 함수가 조용히 null을 반환)만 규칙 기반 `autoDetectScrapeConfig()`를 시도한다.
**검증**: 로컬에서 실제로 `ahnheejong.name/articles`(등록 안 된 사이트)를 미리보기로 등록 시도 — AI 경로가 67개 글을 정상적으로 찾아 성공했고(임시 로그로 `aiConfig found? true` 확인 후 제거), 규칙 기반 경로는 시도되지 않고 건너뛴 것을 확인.
**영향**: `src/app/sources/actions.ts`(`addSourceFlowAction`의 스크래핑 분기 순서만 교체, 로직 자체는 변경 없음).

### 2026-08-11 — 완전 CSR(SPA) 사이트를 헤드리스 브라우저 없이 지원: 검색엔진 크롤러 UA 폴백
**배경**: 사용자가 `https://d2.naver.com/home` 등록 시 AI도 규칙 기반도 선택자를 못 찾는다고 문의. 원본 HTML을 직접 확인한 결과 `<div class="contents"></div>`가 완전히 비어 있었음 — 목록이 전부 클라이언트 JS로 렌더링되는 SPA라, 선택자가 아무리 정확해도 담을 데이터 자체가 원본 HTML에 없는 근본적으로 다른 문제였음(개별 글 상세 페이지도 CSR이고 sitemap.xml도 없어 og:image류 우회도 불가능함을 확인). 헤드리스 브라우저(Playwright 등)가 유일한 범용 해법이지만 `architecture.md`에서 이미 유지보수 비용 대비 실익이 낮다고 배제한 방식.
**발견**: 이 사이트에 **Googlebot UA로 요청하면 서버가 완전히 다른, 이미 렌더링된 HTML을 내려줌**(일반 UA 4,080바이트 빈 셸 → Googlebot UA 20,585바이트, 실제 글 목록 포함)을 직접 재현 확인. SEO를 위해 알려진 크롤러 UA에 미리 렌더링된 스냅샷을 주는 "동적 렌더링"이 원인 — 헤드리스 브라우저 없이 User-Agent 헤더만 바꿔서 해결 가능한 사이트가 CSR 사이트 중 상당수 있을 것으로 추정.
**결정**: `ScrapeConfig`에 `useBotUserAgent?: boolean` 필드를 추가하고, 소스 등록 시 일반 UA로 AI/규칙 기반이 모두 실패하면 **무료인 규칙 기반부터 Googlebot UA로 재시도**(비용 없음) → 그것도 실패해야 AI를 Googlebot UA로 한 번 더 호출(최후 수단)하도록 폴백 체인을 확장. 성공한 경로의 결과에 `useBotUserAgent:true`를 심어 저장하면, `scrapeSource()`가 이 플래그를 보고 일일 크론 수집 때도 자동으로 같은 UA를 재사용 — 등록 시점과 매일 수집 양쪽 다 추가 헤드리스 브라우저 비용 없이 해결됨.
**검증**: 로컬 프로덕션 빌드로 실제 `d2.naver.com/home`을 미리보기 등록 시도 — "20개의 글을 찾았어요"로 실제 최신 글 제목들(Googlebot UA로 확인했던 것과 일치)이 정상 추출됨을 확인. 실제 소스로 저장(등록)까지는 진행하지 않음(테스트 목적).
**한계**: 모든 CSR 사이트가 동적 렌더링을 지원하진 않음(일부는 크롤러도 차단) — 이 폴백이 안 통하는 사이트는 여전히 지원 대상 밖(surfit.io 사례와 동일). d2.naver.com 자체는 사실 `/d2.atom` Atom 피드도 갖고 있어(현재 `discoverFeed()`가 못 찾는 비표준 경로) 피드 자동탐지를 개선하면 이 폴백 없이도 더 간단히 해결되는 케이스지만, 그 개선은 이번엔 별도로 미룸.
**영향**: `src/lib/ingestion/user-agent.ts`(`BOT_USER_AGENT` 추가), `src/lib/ingestion/types.ts`(`ScrapeConfig.useBotUserAgent`), `src/lib/ingestion/scrape-source.ts`, `src/lib/ingestion/auto-detect-scrape-config.ts`/`ai-selector-inference.ts`(UA 파라미터화), `src/app/sources/actions.ts`(폴백 체인 확장), `src/components/add-source-form.tsx`(hidden input 추가).

### 2026-08-11 — d2.naver.com을 결국 RSS/Atom으로 정상 인식: 비표준 피드 링크 탐지 + rss-parser 406 버그 수정
**배경**: 위 결정에서 미뤄뒀던 "d2.naver.com은 사실 `/d2.atom` 피드가 있다"는 케이스를 이어서 처리. `discoverFeed()`에 `<a href>` 중 `.atom`/`.rss`로 끝나는 링크를 훑어보는 탐지를 추가했는데도 여전히 scrape로 떨어져서, 임시 로그로 단계별 추적함.
**발견한 두 가지 버그**:
1. **탐지 자체는 성공, 그런데 결과가 반영 안 됨**: 앵커 탐지는 정상적으로 `https://d2.naver.com/d2.atom`을 찾아 `feedType:'atom'`까지 정확히 판정했는데, 최종적으로 `addSourceFlowAction`은 계속 `feedType:'scrape'`를 반환하고 있었음.
2. **진짜 원인은 `parseFeed()`(rss-parser)가 이 피드에서 매번 `Status code 406`으로 실패하고 있었음**: `discoverFeed()`의 자체 fetch는 `Accept:"*/*"`를 보내 통과했지만, `rss-parser`의 `Parser` 설정엔 `Accept` 헤더가 전혀 없었음 — 이 피드 서버가 Accept 헤더 없는 요청을 406으로 거부. `addSourceFlowAction`이 `parseFeed(...).catch(() => ({articles:[]}))`로 이 실패를 조용히 삼켜서, "RSS를 찾았지만 항목이 0개"인 것처럼 보여 그대로 scrape 폴백으로 흘러갔음 — 2026-07-30 tech.kakaopay.com 사례("빈 스텁 피드")와 겉보기 증상은 같지만 원인은 다른, 새로운 종류의 버그였음.
**수정**: (1) `discoverFeed()`에 `<link rel=alternate>` 확인 다음으로 `<a href$=".atom|.rss">` 탐지를 추가. (2) `parse-feed.ts`의 `rss-parser` 생성자에 `Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"` 헤더를 명시적으로 추가.
**검증**: 로컬 프로덕션 빌드에서 `d2.naver.com/home`을 실제로 등록 시도 — 최종 상태가 `feedType:"atom"`, `feedUrl:"https://d2.naver.com/d2.atom"`으로 정상 확정되고, 미리보기에 Atom 피드 본문(content:encoded) 기반의 풍부한 요약이 표시되는 것까지 확인(스크래핑 결과와 뚜렷이 다른 형태라 경로 전환을 시각적으로도 재확인함).
**영향**: `src/lib/ingestion/discover-feed.ts`, `src/lib/ingestion/parse-feed.ts`.
