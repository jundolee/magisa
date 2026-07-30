// 로그인 없이 브라우저별로 읽음/안읽음을 구분하기 위한 익명 방문자 쿠키.
export const VISITOR_COOKIE_NAME = "magisa_visitor";

// 이 마이그레이션 이전에 전역으로 읽음 처리돼 있던 글들의 스냅샷을 들고 있는 특수 visitor_id.
// 신규 방문자가 최초 쿠키를 받을 때 이 스냅샷을 자신의 읽음 상태로 복사해 온다 (proxy.ts 참고).
export const LEGACY_VISITOR_ID = "__legacy__";
