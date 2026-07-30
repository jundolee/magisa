// Web Crypto API(crypto.subtle)만 사용 — Edge 런타임(미들웨어)과 Node.js 런타임(서버 액션) 양쪽에서 동일하게 동작한다.
export const ADMIN_COOKIE_NAME = "magisa_admin";

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
