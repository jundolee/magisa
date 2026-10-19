# 테크곳간 사용 확대 전략

이 문서는 테크곳간의 사용 확대를 위해 마케팅과 기술 변경을 함께 설계하고 실행하는 작업 기준이다.
현재 제품은 여러 테크 블로그의 새 글을 공통 피드로 모아 보여주고, 검색·주제 탐색·읽음·즐겨찾기·RSS를
제공한다. 사용자별 소스 설정처럼 제품 모델을 바꾸는 결정은 별도 제품 선택으로 남긴다.

## 현재 제품 구조가 growth 전략에 미치는 제약

- 글 목록(`/`)은 **모두에게 동일한 단일 큐레이션 피드**다. `sources`(구독 블로그 목록)는 관리자 1명만
  등록/삭제할 수 있고(`/sources`, `ADMIN_PASSWORD` 게이트), 로그인해도 자기만의 블로그 목록을 만들 수는
  없다 — 로그인의 효과는 "읽음/즐겨찾기 상태가 계정에 저장된다"는 것뿐(`docs/decisions.md` 2026-07-30,
  2026-08-13 참고).
- 클릭하면 원문(외부 사이트)으로 이동한다. 자체 블로그 글 전문을 제공하지 않으므로, 색인 가능성은 검색어별
  검색 결과 페이지가 아니라 제목·요약·주제·발행처·주간 아카이브에 의존한다. 이 페이지들은 유입 경로가 될
  수 있지만, 얇은 목록만 늘리면 차별성이나 검색 성과가 보장되지는 않는다.
- 사용 확대는 우선 세 가지를 묶어 진행한다:
  1. 이름과 첫 화면에서 "여러 테크 블로그 글을 모아 찾고 이어 읽는 서비스"라는 약속을 분명히 한다.
  2. 검색을 전체 수집 글에 적용하고, 글이 실제로 있는 주제·블로그 페이지만 색인 대상으로 둔다.
  3. 원문 클릭과 검색 성공·실패를 측정해 어떤 글과 주제가 재방문을 만드는지 확인한다.

멀티테넌시(사용자별 소스 목록)로 가는 옵션도 있지만 이건 스키마/쿼리 전면 재설계급 작업이라 별도로
논의하고 결정할 사안으로 남겨둔다(아래 "보류" 참고).

## 실행 항목

| 항목 | 상태 | 파일 |
|---|---|---|
| 자체 RSS 피드(`/feed.xml`) 공개 — 남들이 자기 리더로 이 큐레이션을 구독 | 완료 | `src/app/feed.xml/route.ts`, `src/app/layout.tsx`(alternate 링크) |
| 헤더에 RSS 구독 링크 노출 | 완료 | `src/components/page-header.tsx` |
| 처음 온 방문자용 한 줄 소개 + 로그인 가치 설명 | 완료 | `src/app/page.tsx` |
| "블로그 추천하기" 공개 제안 폼 — 소스 등록 권한은 안 열되, 추천은 누구나 | 완료 | `src/app/suggest/*`, `src/lib/data/source-suggestions.ts`, `supabase/migrations/0010_source_suggestions.sql` |
| 관리자가 추천 목록을 `/sources`에서 검토/처리 | 완료 | `src/app/sources/page.tsx`, `src/app/sources/actions.ts` |
| `/suggest` sitemap 처리 | 제외 | `noindex` 페이지이므로 sitemap에서 제외 (`src/app/suggest/page.tsx`, `src/app/sitemap.ts`) |
| 이메일 일일 다이제스트 (로드맵에 이미 있던 항목 — 재방문·공유를 유도하는 가장 강한 레버) | 보류 | 발신 인프라(Resend 등) 결정 필요, 별도 작업으로 진행 권장 |
| 검색 메타데이터·canonical·WebSite/Organization 구조화 데이터 보강, `/suggest` noindex | 완료 | `src/app/layout.tsx`, `src/app/suggest/page.tsx` |
| 브랜드와 첫 화면을 실제 기능에 맞춤 | 완료(코드) | `src/app/seo.ts`, `src/app/page.tsx`, `src/components/brand-link.tsx` |
| OG 이미지(사이트 대표 이미지) 생성 — 카톡/슬랙 공유 시 미리보기 품질 | 완료 | `src/app/opengraph-image.tsx` |
| 검색 결과를 제목·요약·태그의 전체 아카이브 검색으로 맞춤 | 완료(코드) | `supabase/migrations/0013_tokenized_article_search.sql`, `src/components/article-list.tsx` |
| 카테고리 허브를 최신 200건 제한에서 분리하고 빈 주제를 색인 제외 | 완료(코드) | `supabase/migrations/0014_public_hub_queries.sql`, `src/app/topics/*` |
| 공개 블로그 목록과 블로그별 최신 글 허브 | 완료 | `src/app/blogs/*`, `src/lib/data/public-hubs.ts` |
| 주간 테크 큐레이션 아카이브 | 완료 | `src/app/digest/*`, `src/lib/data/weekly-digests.ts` |
| 주제·블로그·주간 아카이브를 포함하는 동적 sitemap | 완료 | `src/app/sitemap.ts` |

## 현재 적용·배포 상태

- 원격 Supabase의 `source_suggestions` 테이블은 존재하며, 예상 컬럼과 RLS 활성화 상태를 확인했다.
- `0013_tokenized_article_search.sql`과 `0014_public_hub_queries.sql`을 2026-10-19에 대상
  `magisa-reader` 프로젝트의 SQL Editor에서 적용했다. 검색 RPC는 `react typescript` 조회에서 10건을
  반환했고, 공개 허브 RPC는 블로그 36개와 색인 가능한 주제 8개를 반환했다. 허브 RPC는 `service_role`에
  실행 권한이 있고 `anon`에는 없는 것도 확인했다. Dashboard migration history 테이블은 존재하지 않아
  CLI 마이그레이션 이력은 별도로 기록되지 않았다.
- Supabase Auth Site URL을 `https://techgotgan.vercel.app`으로 변경하고
  `https://techgotgan.vercel.app/auth/callback`을 redirect allowlist에 추가했다. 기존 호스트와 로컬 주소는
  유지했다. Google OAuth 동의 화면도 테크곳간과 새 홈페이지·개인정보처리방침 주소로 갱신했다.
- Search Console에서 `https://techgotgan.vercel.app/` 속성 소유권을 확인했다. sitemap 제출과 검색 성과
  기준선 기록은 새 코드 배포 후 진행한다.
- Vercel의 새 주소는 응답하지만, 현재 배포 HTML의 canonical·robots·sitemap은 아직
  `magisa.vercel.app`을 가리킨다. 코드 변경을 배포한 뒤 새 호스트 응답을 다시 확인해야 한다. 이전 주소는
  현재 Vercel에서 `DEPLOYMENT_NOT_FOUND`를 반환한다.

## 보류: 멀티테넌시(사용자별 소스 목록)

로그인한 사용자가 각자 자기 블로그 목록을 관리하게 하려면 `sources.user_id`(이미 nullable 컬럼으로
존재, 2026-07-28 결정 참고)를 실제로 채우고, 글 목록/수집 파이프라인을 사용자별로 분리해야 한다. 이건
"성장 전략 실행" 범위를 넘어서는 제품 방향 결정이라 이번엔 진행하지 않았다 — 필요하면 별도로 논의.

## 마케팅과 기술 측정 기준

현재 전략의 목표는 공개 사용 확대라는 가설에 기반하며, 유입·활성화·재방문에 대한 실제 기준값은 아직 확인되지 않았다. 검색 유입을 개선했다고 판단하기 전에 다음 지표의 기준선을 Search Console과 제품 분석에서 확보한다.

| 단계 | 지표 | 측정 방법 |
|---|---|---|
| 유입 | 비브랜드/브랜드 검색 노출·클릭·CTR | Search Console에서 쿼리 유형을 나눠 비교 |
| 첫 가치 경험 | 방문 세션 중 원문 기사 클릭 비율 | `article_click` 이벤트와 세션 수 비교 |
| 탐색 품질 | 검색 실행 수, 결과 0건 비율, 결과 후 원문 클릭률 | `article_search_completed`에 글자 수·단어 수·결과 수만 기록하고 검색어 원문은 저장하지 않음 |
| 재방문 | 7일 내 다시 방문해 읽음·즐겨찾기·원문 클릭을 한 사용자 | Amplitude의 재방문 사용자 및 이벤트 흐름 |

Amplitude는 이제 전체 URL·검색어를 자동 수집하지 않고 `page_viewed`의 경로와 `article_search_completed`의 길이·단어 수·결과 수만 보낸다. 실제 키 설정과 수집은 배포 후 확인해야 한다. Search Console은 로그인 권한이 없어 이번 점검에서 실적을 읽지 못했다. 기준선이 확보되기 전에는 검색 유입 증가율이나 전환 목표를 임의로 완료 기준으로 만들지 않는다. Google Tag Manager 컨테이너의 GA 설정도 별도로 확인해야 한다.

## 브랜드 결정 사항

### 결정: 테크곳간 (Techgotgan)

기존 `Magisa` URL과 `매일 읽는 테크 기사` 설명문은 고유 브랜드를 만들지 못했고, 라이브 홈의 첫 제목도 `글 목록`에 그쳐 서비스 용도가 흐렸다. 공개 이름을 `테크곳간`으로 정하고 "테크 블로그 글을 한곳에서 찾아 읽는다"는 설명을 붙였다. Vercel 주소도 `techgotgan.vercel.app`으로 바뀌었지만, 실제 배포 HTML은 아직 이전 SEO 값을 내보낸다.

검색 결과에서 기술 블로그를 모아 보여주는 제품은 이미 존재한다. 예를 들어 [Tech Tab](https://chromewebstore.google.com/detail/tech-tab-%EC%83%88-%ED%83%AD%EC%97%90%EC%84%9C-%EB%A7%8C%EB%82%98%EB%8A%94-%EA%B5%AD%EB%82%B4-%EB%B9%85%ED%85%8C%ED%81%AC/kobpfgadkgconpdpdppekbioiebnoggc?hl=en)은 새 탭에서 기술 블로그 피드를 보여주고, [한눈IT](https://dev.to/hanun_9b2547365f8fff54006/i-built-a-platform-that-aggregates-30-it-news-sources-so-you-dont-have-to-check-them-all-4mok)은 여러 IT 소스의 글을 모은다고 설명한다. 그러므로 이름만 바꾸는 것으로 차별화를 주장하지 않는다. 테크곳간이 실제로 제공하는 전체 글 검색, 주제·발행처 허브, 읽음·즐겨찾기, 주간 아카이브와 RSS를 첫 화면에서 선명하게 설명한다.

2026-10-19 확인 기준 `techgotgan.com`, `techgotgan.kr`, `techgotgan.co.kr`은 각 등록기관 RDAP에서 등록 레코드를 찾지 못했다. 이후 사용자가 Vercel 프로젝트 주소를 `techgotgan.vercel.app`으로 변경했고, 현재 새 주소는 200 응답을 반환한다. 같은 시점에 새 호스트의 `robots.txt`와 sitemap, HTML canonical·Open Graph URL은 `magisa.vercel.app`을 가리켰고, 이전 호스트는 `DEPLOYMENT_NOT_FOUND`였다. 따라서 이번 소스 변경을 배포하고 새 URL을 재확인해야 한다.

RDAP와 공개 HTTP 응답은 조회 시점의 상태일 뿐 구매 가능 여부, 상표권, 유사 상호까지 보장하지 않는다. 코드의 canonical·Open Graph·robots·sitemap·RSS 주소는 `techgotgan.vercel.app`으로 바꿨다. 다만 현재 Vercel 배포본은 이전 값을 내보내므로 재배포 확인이 필요하다. OAuth redirect allowlist와 Google Search Console 새 사이트 속성/인증 토큰은 외부 설정에서 갱신해야 한다. Search Console 인증 토큰은 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`으로 받으며 새 토큰이 없으면 메타 태그를 출력하지 않는다. 이전 Vercel 주소는 현재 연결되지 않아 301을 제공하지 못한다. 예전 주소를 다시 alias로 연결할 수 있는지 계정에서 확인해야 한다.

## 2026-10-19 라이브 점검

- 공개 홈과 주제·블로그 페이지는 200 응답을 반환했고, 홈 설명은 수집 피드와 읽음·즐겨찾기를 안내했다. 하지만 Search Console 페이지는 로그인 화면으로 이동해 검색 노출·클릭 기준선을 확인할 수 없었다.
- 공개 sitemap의 모든 항목은 `2026-09-22`를 `lastmod`로 표시했지만, 홈에는 2026-10-18 날짜의 새 글이 보였다. 콘텐츠 발견 시각을 사용하도록 바꾼 코드를 배포한 뒤 sitemap의 `lastmod`가 실제 데이터와 맞는지 재확인한다.
- `/topics`는 당시 글이 없는 카테고리도 모두 연결했고, 주제 허브는 최신 피드 200건만 사용했다. `0014` 이후에는 활성 소스의 전체 아카이브에서 주제별 최근 글 20건을 읽고, 빈 주제는 목록·sitemap에서 빼며 페이지에 `noindex`를 적용한다.
- 검색어는 주소의 `q`에 남겨 링크로 공유할 수 있다. Amplitude는 자동 URL 캡처를 끄고 경로만 기록하도록 수정했다. GTM/GA 설정은 계정 접근이 없어 확인하지 못했다.
