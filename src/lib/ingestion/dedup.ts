import { createHash } from "node:crypto";

const TRACKING_PARAM_PREFIXES = ["utm_"];
const TRACKING_PARAMS = new Set(["fbclid", "gclid", "ref", "ref_src"]);

/**
 * 같은 글이 매번 다른 트래킹 파라미터로 재수집되어 중복으로 쌓이는 것을 막기 위한 정규화.
 */
export function canonicalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  const keptParams = [...url.searchParams.entries()].filter(
    ([key]) =>
      !TRACKING_PARAM_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix)) &&
      !TRACKING_PARAMS.has(key.toLowerCase())
  );
  keptParams.sort(([a], [b]) => a.localeCompare(b));

  url.search = "";
  for (const [key, value] of keptParams) {
    url.searchParams.append(key, value);
  }

  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }
  url.pathname = pathname;

  return url.toString();
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * dedup_key 우선순위: (1) 피드 guid/id (2) 정규화된 URL (3) title+url 해시.
 * architecture.md 3절 "중복 방지" 참고.
 */
export function computeDedupKey(input: { guid?: string | null; url: string; title: string }): string {
  if (input.guid) {
    return `guid:${input.guid}`;
  }
  if (input.url) {
    try {
      return `url:${canonicalizeUrl(input.url)}`;
    } catch {
      // URL 파싱 실패 시 마지막 폴백으로 넘어감
    }
  }
  return `hash:${sha256(`${input.title}::${input.url}`)}`;
}
