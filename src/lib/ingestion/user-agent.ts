/**
 * 일부 사이트(예: medium.com)가 스스로를 밝히는 봇 UA("MagisaBot/0.1" 등)의 홈페이지 요청은
 * 403으로 차단하면서도(IP가 아니라 UA 기준), RSS 피드 엔드포인트나 일반 브라우저 UA는 그대로 허용한다.
 * 개인이 구독한 공개 블로그를 하루 한 번 읽어오는 저부하·비상업적 용도라 브라우저 UA로 통일한다.
 * (docs/decisions.md 참고)
 */
export const INGESTION_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * 완전 클라이언트 렌더링(SPA) 사이트 중 일부는 SEO를 위해 알려진 검색엔진 크롤러 UA에는
 * 미리 렌더링된 HTML을 따로 내려준다("동적 렌더링") — 일반 브라우저 UA로는 빈 셸만 받는 사이트가
 * 이 UA로는 실제 글 목록을 담은 HTML을 받을 수 있다 (d2.naver.com에서 확인, docs/decisions.md 참고).
 * 헤드리스 브라우저 없이 이 케이스를 해결하는 저비용 폴백.
 */
export const BOT_USER_AGENT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
