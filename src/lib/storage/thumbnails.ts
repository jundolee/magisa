import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "thumbnails";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — Notion 등 일부 CMS가 원본 해상도 이미지를 그대로 서빙해 5MB로는 부족했음
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "MagisaBot/0.1 (+personal tech blog aggregator)";

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/**
 * 일부 CDN(예: static.toss.im)이 실제로는 이미지인데도 Content-Type을
 * `binary/octet-stream`처럼 뭉뚱그려 내려준다. 그럴 땐 URL 자체의 확장자로 폴백한다.
 */
function guessExtension(contentType: string, url: string): string | null {
  const byContentType = EXT_BY_CONTENT_TYPE[contentType];
  if (byContentType) return byContentType;

  const pathname = url.split("?")[0];
  const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  return ext && CONTENT_TYPE_BY_EXT[ext] ? ext : null;
}

// 콜드 스타트당 한 번만 확인하면 되는 최적화 — 실패해도 매 호출마다 다시 시도하므로 안전하다.
let bucketEnsured = false;

async function ensureBucket(supabase: SupabaseClient): Promise<void> {
  if (bucketEnsured) return;
  const { error } = await supabase.storage.getBucket(BUCKET);
  if (error) {
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  }
  bucketEnsured = true;
}

/**
 * 원본 썸네일 URL이 만료되는 서명 URL(S3 presigned 등)인 경우가 많아, 이미지를 직접 다운로드해서
 * Supabase Storage에 영구 보관하고 우리 쪽 공개 URL을 돌려준다. 실패하면 null (호출자는 원본 URL을 유지하면 됨).
 * docs/decisions.md 참고 — bucketplace.com/culture/의 Notion 기반 이미지가 이 문제의 계기.
 */
export async function mirrorThumbnail(
  supabase: SupabaseClient,
  sourceUrl: string,
  articleId: string
): Promise<string | null> {
  try {
    await ensureBucket(supabase);

    const res = await fetch(sourceUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const rawContentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const ext = guessExtension(rawContentType, sourceUrl);
    if (!ext) return null;
    const uploadContentType = CONTENT_TYPE_BY_EXT[ext];

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null;

    const path = `${articleId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: uploadContentType, upsert: true });
    if (uploadError) return null;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}
