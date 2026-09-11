/**
 * 우아한형제들 등 클라우드(AWS/Vercel) IP 대역을 WAF에서 차단(403)하는 사이트를 위해
 * Cloudflare Worker 등 외부 프록시 경유 URL을 생성하는 유틸리티.
 */

const BLOCKED_DOMAINS = [
  "techblog.woowahan.com",
];

export function isBlockedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return BLOCKED_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * RSS_PROXY_URL 환경변수가 설정되어 있는 경우, 대상 URL을 프록시를 경유하도록 래핑한다.
 * 설정되어 있지 않거나 이미 프록시가 적용된 경우 원본 URL을 그대로 반환한다.
 */
export function getProxiedUrl(targetUrl: string): string {
  const proxyBase = process.env.RSS_PROXY_URL?.trim().replace(/\/+$/, "");
  if (!proxyBase) return targetUrl;
  if (targetUrl.startsWith(proxyBase)) return targetUrl;
  return `${proxyBase}/?url=${encodeURIComponent(targetUrl)}`;
}
