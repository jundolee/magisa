import * as cheerio from "cheerio";
import { INGESTION_USER_AGENT } from "./user-agent";

const FETCH_TIMEOUT_MS = 5_000;

/**
 * RSS 필드(enclosure/media:* 등)나 스크래핑 thumbnailSelector로 썸네일을 못 찾았을 때의 공통 폴백 —
 * 글 원문 페이지를 직접 열어 og:image(또는 twitter:image)를 읽어온다. 피드/스크래핑 설정과 무관하게
 * 대부분의 사이트가 공유하는 메타 태그라 소스별 셀렉터 설정 없이도 커버리지를 넓힐 수 있다.
 * 실패(네트워크 오류, 타임아웃, 태그 없음)해도 조용히 null을 반환할 뿐 수집 자체를 막지 않는다.
 */
export async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": INGESTION_USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const $ = cheerio.load(await res.text());
    const raw =
      $('meta[property="og:image"]').attr("content") ??
      $('meta[property="og:image:url"]').attr("content") ??
      $('meta[name="twitter:image"]').attr("content") ??
      $('meta[name="twitter:image:src"]').attr("content");
    if (!raw) return null;

    return new URL(raw, articleUrl).toString();
  } catch {
    return null;
  }
}
