# 아키텍처 설계 — 개인 테크 블로그 아카이버

`requirements.md`에 정의된 요구사항을 기술적으로 어떻게 구현할지 정리한 문서. 아직 실제 코드/프로젝트는 생성하지 않았다 — 구현 착수 시 이 문서를 기준으로 진행한다.

## 1. 전체 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Next.js (App Router) + TypeScript** | SEED Design이 React 기반 → React 생태계에서 가장 표준적인 선택. UI와 수집(크론) 백엔드를 한 배포 단위로 처리 가능 |
| 배포 | **Vercel** | Next.js와 궁합 최적, git push로 배포, **Vercel Cron**으로 일일 수집 작업을 별도 서버 없이 실행 가능 |
| DB/Auth | **Supabase (Postgres)** | 요구사항에 명시. Auth도 필요해지면(Phase 2) 같은 프로젝트에서 바로 사용 가능 |

한 개의 Next.js 앱이 화면(UI)과 수집 파이프라인(API Route + Cron) 을 모두 담당한다. 별도 백엔드 서버는 두지 않는다 — 개인용 규모에서는 불필요한 복잡도.

## 2. Supabase 스키마 (초안)

### `sources` — 등록한 블로그
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| user_id | uuid, nullable | 지금은 무인증이라 비워둠. Phase 2에서 로그인 추가 시 백필 |
| site_url | text | 블로그 홈 URL |
| feed_url | text, nullable | 자동 탐지된 RSS/Atom 주소 |
| feed_type | text | `rss` \| `atom` \| `scrape` \| `unknown` |
| scrape_config | jsonb, nullable | RSS 없는 사이트용 셀렉터 설정 |
| title | text, nullable | 사이트 이름 |
| is_active | boolean default true | 일시중지 여부 |
| last_checked_at | timestamptz, nullable | |
| last_success_at | timestamptz, nullable | |
| last_error | text, nullable | 수집 실패 원인 기록 |
| created_at | timestamptz default now() | |

### `articles` — 수집된 글 (메타데이터만)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | |
| source_id | uuid FK → sources | |
| title | text | |
| url | text | 원문 링크 |
| excerpt | text, nullable | 요약 |
| thumbnail_url | text, nullable | |
| published_at | timestamptz, nullable | |
| discovered_at | timestamptz default now() | 우리 시스템이 발견한 시각 |
| dedup_key | text | 중복 방지 키 |
| is_read | boolean default false | |
| read_at | timestamptz, nullable | |

인덱스: `unique(source_id, dedup_key)`, `index(published_at desc)`, `index(source_id)`

**읽음 상태를 별도 조인 테이블이 아니라 `articles.is_read` 컬럼 하나로 처리**하기로 결정 — 지금은 사용자가 한 명뿐이라 글마다 "누가 읽었는지"를 구분할 필요가 없음. 여러 사용자가 같은 글을 공유해서 보는 구조로 바뀌면(현재 계획엔 없음) 그때 조인 테이블로 분리.

### 접근 방식 (무인증 MVP)
- 클라이언트에서 Supabase를 직접 호출하지 않는다. **모든 DB 접근은 Next.js 서버 사이드(Server Component, Route Handler)에서 서비스 롤 키로 수행.**
- RLS는 활성화해두되(기본 정책), 서비스 롤 키가 이를 우회하는 구조 — 로그인이 없는 지금도 최소한의 안전판.
- Phase 2에서 로그인을 붙일 때는 `sources`/`articles`의 `user_id`를 채우고 RLS 정책을 `auth.uid() = user_id`로 추가하면 된다 (스키마 재설계 불필요).

## 3. 수집 파이프라인

### 피드 자동 탐지 (소스 등록 시 1회)
1. 홈페이지 HTML에서 `<link rel="alternate" type="application/rss+xml">` / `atom+xml` 태그 탐색
2. 없으면 관례적 경로 순차 프로브: `/feed`, `/feed/`, `/rss.xml`, `/atom.xml`, `/index.xml`(Hugo), `/feeds/posts/default`(Blogger) — 응답이 실제 XML인지 확인
3. 그래도 없으면 `feed_type = 'unknown'` → 사용자가 직접 `scrape_config`를 입력해 스크래핑 모드로 등록

### RSS/Atom 파싱
- **`rss-parser`** 라이브러리 사용 (TypeScript 지원, RSS 2.0/Atom 자동 판별)

### 스크래핑 폴백 (MVP부터 포함)
- 범용 자동 스크래퍼(레이아웃 추론)나 헤드리스 브라우저(Playwright 등)는 쓰지 않는다 — 유지보수 비용 대비 실익이 낮음.
- 대신 **사이트별 CSS 셀렉터를 JSON으로 직접 입력**받는다: `listItemSelector`, `titleSelector`, `linkSelector`(+ `linkAttr`), `excerptSelector`, `dateSelector`, `thumbnailSelector`.
- 매일 수집 시 plain `fetch` + **`cheerio`**로 파싱, RSS와 동일한 `articles` 스키마로 매핑.

### 일괄 등록
- 사용자가 붙여넣은 URL 목록을 줄 단위로 분리 → 각 URL에 대해 단건 등록과 동일한 피드 자동탐지 로직을 순차 실행.

### 스케줄러
- **Vercel Cron → Next.js Route Handler** (`/api/cron/ingest`), 요청 헤더의 `CRON_SECRET`으로 보호.
- Supabase Edge Function(Deno 런타임)은 `rss-parser`/`cheerio`의 Deno 호환성이 불확실하고 런타임이 둘로 나뉘는 문제가 있어 배제.
- GitHub Actions 스케줄은 무료지만 실행 지연/60일 미사용 시 자동 비활성화 등 "best-effort" 특성이 있어 배제.

### 중복 방지
- `dedup_key` 우선순위: (1) 피드의 `<guid>`/`<id>` (2) 정규화한 URL(utm 파라미터 제거, 트레일링 슬래시 제거, 소문자화) (3) 스크래핑 소스는 `title + url` 해시
- `unique(source_id, dedup_key)` 제약 + `INSERT ... ON CONFLICT DO NOTHING`으로 재실행에도 안전.

## 4. SEED Design 통합

- 공식 문서 확인 결과, SEED Design은 Vite/Rsbuild/Webpack용 번들러 플러그인만 문서화되어 있고 **Next.js 전용 가이드는 없음.**
- 대신 **"Manual install" 경로**(번들러 플러그인 없이 순수 npm 설치 + CSS import)는 번들러에 종속되지 않아 Next.js에서도 동작할 가능성이 높다:
  1. `npm install @seed-design/react @seed-design/css`
  2. 엔트리 포인트에서 `import "@seed-design/css/all.css"`
  3. `npx @seed-design/cli@latest init` → `seed-design.json` 생성
  4. `tsconfig.json`에 `seed-design/*` 경로 alias 추가
  5. `npx @seed-design/cli add ui:xxx`로 필요한 컴포넌트를 `seed-design/` 폴더에 복사
- CLI가 생성하는 `seed-design.json`에 `rsc` 플래그가 있는 것으로 보아(shadcn/ui의 `components.json`과 유사한 구조) Next.js App Router(RSC)를 어느 정도 염두에 둔 것으로 추정되지만, **공식적으로 검증된 바는 아님.**
- **번들러 플러그인은 Next.js의 Webpack/Turbopack 설정에 억지로 끼워 넣지 않는다** — 비용 대비 리스크가 큼. Manual install로 전체 CSS를 한 번에 로드하는 방식(컴포넌트별 최적화는 포기)이 개인용 앱에는 충분.
- **다크모드는 MVP에서 제외, 라이트 모드 고정.** `data-seed-color-mode`를 `app/layout.tsx`(Server Component)에서 정적으로 설정하면 되므로 SSR/hydration 이슈가 없음. 다크모드 토글은 Phase 2에서 `next-themes` 패턴(hydration 전에 동작하는 인라인 스크립트)으로 추가.

**⚠️ 리스크: SEED Design의 Next.js 호환성은 검증되지 않음.** 구현 착수 시 다른 작업보다 먼저 — 빈 Next.js 프로젝트에 Manual install로 SEED Design을 설치하고 컴포넌트 하나(`ui:button` 등)가 정상 렌더링되는지 확인하는 **스파이크를 최우선으로 진행**한다. 문제가 있어도 완전히 막히지는 않음 — 디자인 토큰(CSS 변수)과 로직 레이어는 자체 마크업과 함께 써도 되기 때문.

## 5. 배포/보안 참고
- Vercel Hobby(무료) 플랜의 크론 실행시간 제한은 하루 1회 수집 작업 규모에서는 문제 없음.
- 무인증 상태로 공개 배포되므로, 검색엔진 노출 방지를 위한 `robots.txt noindex` 정도는 적용 권장.
- Supabase 마이그레이션은 대시보드 수동 편집 대신 **CLI 버전관리 마이그레이션(`supabase/migrations/*.sql`)**을 권장 — 스키마 변경 이력을 코드와 함께 관리.

## 6. 예상 저장소/코드 구조 (구현 시작 시 참고용, 아직 생성 안 함)
```
04-magisa/
  docs/                        # 지금 작성 중인 기획 문서
  src/
    app/
      layout.tsx                # data-seed-color-mode 설정
      page.tsx                  # 글 목록 (홈)
      sources/page.tsx          # 소스 등록/관리 화면
      api/cron/ingest/route.ts  # 일일 수집 크론 엔드포인트 (CRON_SECRET 보호)
    components/                 # seed-design 위에 쌓는 앱 컴포넌트
    seed-design/                # CLI로 생성된 컴포넌트 소스
    lib/
      supabase/service.ts       # 서비스 롤 키 클라이언트 (서버 전용)
      ingestion/
        discover-feed.ts
        parse-feed.ts
        scrape-source.ts
        dedup.ts
  supabase/migrations/           # 버전관리되는 SQL 마이그레이션
  seed-design.json
  vercel.json                    # 크론 스케줄 설정
  .env.local.example
```
