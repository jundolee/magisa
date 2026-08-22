/** 공개 메타데이터와 구조화 데이터에서 함께 쓰는 사이트 기준값. */
export const SITE_URL = "https://magisa.vercel.app";
export const SITE_NAME = "매일 읽는 테크 기사";
export const SITE_TITLE = "테크 블로그 새 글 모아보기 | 매일 읽는 테크 기사";
export const SITE_DESCRIPTION =
  "개발·AI·데이터·제품 분야 테크 블로그의 새 글을 한곳에서 찾아보고, 읽음과 즐겨찾기로 내 목록을 관리하세요.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image`;

// 마지막으로 공개 인덱스 페이지의 메타데이터를 갱신한 날짜다. 새 콘텐츠를 추가할 때만 갱신한다.
// 요청 시각을 사용하면 sitemap의 lastmod가 매번 바뀌어 검색엔진에 잘못된 변경 신호를 보낼 수 있다.
export const SITEMAP_LAST_MODIFIED = "2026-08-20T00:00:00.000Z";
