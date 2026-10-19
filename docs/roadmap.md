# 로드맵

## Phase 1 — MVP (완료)

- [x] SEED Design + Next.js 통합 스파이크 검증
- [x] Supabase 프로젝트 생성 + `sources`/`articles` 스키마 마이그레이션
- [x] 소스 등록: 단건 URL 등록 (피드 자동탐지 + 실패 시 스크래핑 자동 인식/직접 설정)
- [x] 소스 일괄 등록: 여러 URL 붙여넣기
- [x] 소스 목록/일시중지/삭제 화면
- [x] 수집 파이프라인: RSS/Atom 파서 + 스크래핑 파서 + 중복 제거 (소스 내 + 크로스소스)
- [x] Vercel Cron으로 매일 1회 자동 수집
- [x] 글 목록 화면 (최신순, 읽음/안읽음/전체 탭)
- [x] 글 클릭 → 원문 새 탭 이동 + 자동 읽음 처리 / 수동 안읽음 되돌리기
- [x] SEED Design 라이트 모드 UI 적용 (Badge/Text/AspectRatio/SegmentedControl)
- [x] Vercel 배포 (무인증, robots noindex)

MVP 완료 이후 추가로 들어온 요청:
- [x] 크로스소스 중복 제거 (`canonical_url` 전역 유니크 제약)
- [x] 스크래핑 설정 자동 탐지 + 미리보기 (등록 난이도 완화)
- [x] 스크래핑 발행일 URL 슬러그 폴백 + 기존 데이터 백필
- [x] 스크래핑 설정을 JSON 텍스트 대신 셀렉터별 폼 필드로 교체
- [x] 스크래핑 선택자 UI는 자동 인식 실패 시에만 노출 (성공 시 사용자는 URL만 입력)
- [x] 글 목록 정렬을 discovered_at(수집 시각) 기준으로 변경
- [x] 썸네일 영구 저장 (Supabase Storage로 다운로드/재호스팅, presigned URL 만료 문제 해결)
- [x] 자체 RSS 피드(`/feed.xml`) 공개 + "블로그 추천하기" 공개 제안 폼 (`docs/growth-strategy.md` 참고)
- [x] AI 자동 카테고리 및 태깅 (Frontend, Backend, AI/ML 등 8대 표준 카테고리 분류 + 필터 칩 + 배지)
- [x] 제목·요약·태그 단어 검색 (다중 단어와 주요 한영 기술 용어 별칭 지원)
- [x] 공개 블로그 허브 소스별 최신 글 조회, 빈 허브 noindex 및 sitemap 제외
- [x] 콘텐츠 발견 시각에 기반한 sitemap `lastmod`
- [x] 공개 브랜드를 테크곳간으로 정렬하고 첫 화면에 실제 검색·이어 읽기 기능 설명
- [x] 한글/영문 약어·다중 단어 검색과 두 글자 자동 검색
- [x] 전체 수집 아카이브 기반 주제 허브, 빈 허브 `noindex` 및 sitemap 제외

## Phase 2+ 후보 (제안 — 우선순위는 MVP 완료 후 논의)

| 아이디어 | 비고 |
|---|---|
| Supabase Auth 로그인 게이팅 (매직링크 추천) | MVP에서 의도적으로 제외한 항목, 이후 최우선 후보 |
| 다크모드 토글 | `data-seed-color-mode` 인라인 스크립트 패턴 필요 |
| 소스 태그/카테고리 | 소스 수가 20~30개 넘어가면 유용 |
| 읽음 나중에 보기(저장/스타) 큐 | `is_saved` 컬럼 하나로 저비용 구현 가능 |
| 이메일 일일 다이제스트 | 크론 작업 재사용, Resend 등 연동 |
| 목록 키보드 단축키 (j/k/enter/u) | 다독자를 위한 편의 기능 |

이 목록은 확정된 계획이 아니라 후보 제안이다. 진행 중 새로운 아이디어가 생기면 이 표에 계속 추가한다.

## 배포·측정 후속 작업

- [x] `0013_tokenized_article_search.sql`, `0014_public_hub_queries.sql` 적용; 검색 10건, 블로그 36개, 색인 주제 8개와 서비스 역할 권한 확인
- [x] PR #2 프로덕션 배포; sitemap 60개 URL을 확인하고 홈 `lastmod`가 DB 최신 피드 발견 시각과 일치하는지 확인
- [ ] Search Console에서 브랜드/비브랜드 노출·클릭 기준선을 기록
- [ ] Amplitude 키와 `page_viewed`, `article_search_completed` 수집 여부 확인
- [ ] GTM/GA 컨테이너가 페이지 URL의 `q` 검색어를 전송하는지 점검
- [x] `techgotgan.vercel.app` 프로덕션 배포; canonical·Open Graph·robots·sitemap·RSS에서 새 호스트 확인
- [x] Supabase Auth Site URL·redirect allowlist 갱신, Search Console 속성 소유권 확인 및 sitemap 제출; Google에서 60개 URL 발견
- [x] 이전 `magisa.vercel.app`을 새 호스트로 `308` 리다이렉트하고 경로·쿼리 보존 확인
- [ ] `techgotgan.kr` 등록기관·상표 검색은 별도 맞춤 도메인을 도입할 때 재확인
