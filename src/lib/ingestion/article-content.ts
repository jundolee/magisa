import "server-only";
import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import { INGESTION_USER_AGENT } from "./user-agent";
import { getProxiedUrl, isBlockedDomain } from "./feed-proxy";

const MAX_RESPONSE_BYTES = 1_500_000;
// Keep normal technical articles whole (including the 28k-char example verified during review).
// Longer pages are summarized from the leading portion and surfaced as partial extraction.
const MAX_ARTICLE_CHARS = 40_000;
const MIN_ARTICLE_CHARS = 250;
const FETCH_TIMEOUT_MS = 10_000;

export type ArticleExtractionStatus = "supported" | "partial" | "blocked" | "insufficient" | "failed";

export interface ExtractedArticleContent {
  status: ArticleExtractionStatus;
  text: string | null;
  reason: string | null;
}

function isPublicIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = octets;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && (b === 0 || b === 88)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && octets[2] === 100))) ||
    (a === 203 && b === 0 && octets[2] === 113));
}

function isPublicAddress(address: string, family: number): boolean {
  if (family === 4) return isPublicIpv4(address);
  const normalized = address.toLowerCase().split("%")[0];
  // Reject IPv4-mapped and special-purpose IPv6 ranges; allow only global-unicast 2000::/3.
  if (normalized.startsWith("::ffff:") || !/^[23]/.test(normalized)) return false;
  if (/^2001:(?:0|2|10|20|db8):/.test(normalized) || normalized.startsWith("2002:")) return false;
  return true;
}

type TargetResolution =
  | { target: { url: URL; address: string; family: number } }
  | { blockedReason: string }
  | { failedReason: string };

async function resolvePublicTarget(rawUrl: string): Promise<TargetResolution> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { blockedReason: "invalid_url" };
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.hash) return { blockedReason: "invalid_url" };
  const standardPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== standardPort) return { blockedReason: "nonstandard_port" };
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) return { blockedReason: "private_hostname" };

  const family = isIP(hostname);
  let addresses: { address: string; family: number }[];
  try {
    addresses = family ? [{ address: hostname, family }] : await lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { failedReason: "dns_lookup_failed" };
  }
  // Reject mixed public/private DNS answers so the pinned connection cannot choose a private target.
  if (!addresses.length) return { failedReason: "dns_no_addresses" };
  if (addresses.some((record) => !isPublicAddress(record.address, record.family))) return { blockedReason: "private_ip_address" };
  return { target: { url, address: addresses[0].address, family: addresses[0].family } };
}

function pinnedLookup(address: string, family: number) {
  return ((_hostname: string, options: unknown, callback: (...args: unknown[]) => void) => {
    if (options && typeof options === "object" && "all" in options && (options as { all?: boolean }).all) {
      callback(null, [{ address, family }]);
    } else {
      callback(null, address, family);
    }
  }) as never;
}

function readResponse(response: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const contentLength = Number(response.headers["content-length"] ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      response.destroy();
      reject(new Error("response_too_large"));
      return;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    response.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > MAX_RESPONSE_BYTES) {
        response.destroy(new Error("response_too_large"));
        return;
      }
      chunks.push(buffer);
    });
    response.on("end", () => resolve(Buffer.concat(chunks)));
    response.on("error", reject);
  });
}

class ArticleFetchError extends Error {
  constructor(message: string, readonly status: "blocked" | "failed") {
    super(message);
  }
}

type SingleRequestResult = { redirect: string } | { buffer: Buffer; contentType: string };

async function requestPinnedUrl(rawUrl: string, deadline: number): Promise<SingleRequestResult> {
  const resolution = await resolvePublicTarget(rawUrl);
  if ("blockedReason" in resolution) throw new ArticleFetchError(resolution.blockedReason, "blocked");
  if ("failedReason" in resolution) throw new ArticleFetchError(resolution.failedReason, "failed");
  const { url, address, family } = resolution.target;
  const remainingMs = Math.max(1, deadline - Date.now());
  if (remainingMs <= 1) throw new ArticleFetchError("fetch_timeout", "failed");
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: "GET",
      headers: { "User-Agent": INGESTION_USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      lookup: pinnedLookup(address, family),
      timeout: remainingMs,
    }, async (response) => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        const location = response.headers.location;
        response.destroy();
        if (location) resolve({ redirect: location });
        else reject(new ArticleFetchError("redirect_without_location", "blocked"));
        return;
      }
      if ([401, 402, 403, 429].includes(status)) {
        response.destroy();
        reject(new ArticleFetchError(`publisher_http_${status}`, "blocked"));
        return;
      }
      if (status < 200 || status >= 300) {
        response.destroy();
        reject(new ArticleFetchError(`http_${status}`, "failed"));
        return;
      }
      const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        response.destroy();
        reject(new ArticleFetchError("unsupported_content_type", "blocked"));
        return;
      }
      try {
        resolve({ buffer: await readResponse(response), contentType });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "response_read_failed";
        reject(new ArticleFetchError(reason, reason === "response_too_large" ? "blocked" : "failed"));
      }
    });
    const absoluteTimeout = setTimeout(() => req.destroy(new Error("fetch_timeout")), remainingMs);
    req.on("close", () => clearTimeout(absoluteTimeout));
    req.on("timeout", () => req.destroy(new Error("fetch_timeout")));
    req.on("error", (error) => reject(new ArticleFetchError(error.message === "fetch_timeout" ? "fetch_timeout" : "fetch_failed", "failed")));
    req.end();
  });
}

async function fetchHtmlWithSafeRedirects(rawUrl: string): Promise<Buffer> {
  const shouldUseProxy = isBlockedDomain(rawUrl) && Boolean(process.env.RSS_PROXY_URL);
  let currentUrl = shouldUseProxy ? getProxiedUrl(rawUrl) : rawUrl;
  const deadline = Date.now() + FETCH_TIMEOUT_MS;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    try {
      const result = await requestPinnedUrl(currentUrl, deadline);
      if ("buffer" in result) return result.buffer;
      if (redirects === 3) throw new ArticleFetchError("redirect_limit_exceeded", "blocked");
      let next: URL;
      try {
        next = new URL(result.redirect, currentUrl);
      } catch {
        throw new ArticleFetchError("invalid_redirect_url", "blocked");
      }
      const current = new URL(currentUrl);
      if (current.protocol === "https:" && next.protocol !== "https:") throw new ArticleFetchError("redirect_downgrade_blocked", "blocked");
      currentUrl = next.toString();
    } catch (err) {
      // 403 차단 시 외부 프록시(Cloudflare Worker)가 설정되어 있고 아직 프록시를 시도하지 않았다면 1회 폴백
      if (
        err instanceof ArticleFetchError &&
        err.message === "publisher_http_403" &&
        process.env.RSS_PROXY_URL &&
        currentUrl === rawUrl
      ) {
        currentUrl = getProxiedUrl(rawUrl);
        continue;
      }
      throw err;
    }
  }
  throw new ArticleFetchError("redirect_limit_exceeded", "blocked");
}

function extractSpaOrLdJsonText($: cheerio.CheerioAPI): string | null {
  // 1. Nuxt 3 hydration data
  const nuxtScript = $("script#__NUXT_DATA__").text();
  if (nuxtScript) {
    try {
      const data = JSON.parse(nuxtScript);
      if (Array.isArray(data)) {
        const candidates = data.filter((item): item is string => typeof item === "string" && item.length > 400);
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.length - a.length);
          const sub$ = cheerio.load(candidates[0]);
          sub$("script,style,noscript,svg,iframe,nav,footer,header,form,button").remove();
          const blocks = sub$("h1,h2,h3,h4,p,li,pre,blockquote,td,th").toArray()
            .map((el) => sub$(el).text().replace(/\s+/g, " ").trim())
            .filter((t) => t.length > 0);
          const text = (blocks.length > 0 ? blocks.join("\n") : sub$("body").text())
            .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
          if (text.length >= MIN_ARTICLE_CHARS) return text;
        }
      }
    } catch {}
  }

  // 2. Next.js hydration data
  const nextScript = $("script#__NEXT_DATA__").text();
  if (nextScript) {
    try {
      const data = JSON.parse(nextScript) as Record<string, unknown>;
      const pageProps = (data.props as Record<string, unknown> | undefined)?.pageProps as Record<string, unknown> | undefined;
      if (pageProps) {
        for (const val of Object.values(pageProps)) {
          if (typeof val === "string" && val.length > 400) {
            const sub$ = cheerio.load(val);
            const text = sub$("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
            if (text.length >= MIN_ARTICLE_CHARS) return text;
          } else if (val && typeof val === "object" && "content" in val && typeof (val as Record<string, unknown>).content === "string") {
            const sub$ = cheerio.load((val as Record<string, unknown>).content as string);
            const text = sub$("body").text().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
            if (text.length >= MIN_ARTICLE_CHARS) return text;
          }
        }
      }
    } catch {}
  }

  // 3. Schema.org JSON-LD
  let bestLd = "";
  $("script[type=\"application/ld+json\"]").each((_, el) => {
    try {
      const raw = $(el).text();
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const body = typeof item.articleBody === "string" ? item.articleBody : "";
        if (body.length > bestLd.length) bestLd = body;
      }
    } catch {}
  });
  if (bestLd.length >= MIN_ARTICLE_CHARS) {
    return bestLd.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  return null;
}

export function extractMainText(html: string): { text: string; supported: boolean; blocked: boolean; truncated: boolean } {
  const $ = cheerio.load(html);
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 10_000).toLowerCase();
  const hasPaywallElement = $(".paywall, [class*=paywall], [id*=paywall], [data-testid*=paywall], .login-wall, .subscription-required").length > 0;
  const articleTextLength = $("article,[itemprop='articleBody']").toArray()
    .reduce((max, element) => Math.max(max, $(element).text().trim().length), 0);
  const gateMessage = /captcha (?:is )?required|complete (?:the )?captcha|verify (?:that )?you are (?:human|a person)|access denied|subscription required|subscribe to continue|log in to continue|sign in to continue|구독 후 이용|로그인 후 이용|로그인이 필요합니다|접근이 차단/.test(bodyText);
  const paywall = hasPaywallElement || (gateMessage && articleTextLength < MIN_ARTICLE_CHARS);
  if (paywall) return { text: "", supported: false, blocked: true, truncated: false };

  // SPA 및 JSON-LD 스크립트 기반 콘텐츠 우선 확인 (스크립트 제거 전에 수행)
  const spaText = extractSpaOrLdJsonText($);
  if (spaText && spaText.length >= MIN_ARTICLE_CHARS) {
    return {
      text: spaText.slice(0, MAX_ARTICLE_CHARS),
      supported: true,
      blocked: false,
      truncated: spaText.length > MAX_ARTICLE_CHARS,
    };
  }

  $("script,style,noscript,svg,iframe,nav,footer,header,form,button,[aria-hidden=true],.advertisement,.ads,.comments,.comment").remove();
  const selectors = [
    { selector: "article", verified: true },
    { selector: "[itemprop='articleBody']", verified: true },
    { selector: "main", verified: false },
    { selector: "[role='main']", verified: false },
    { selector: ".post-content, [class*='post-content'], [class*='post_content']", verified: true },
    { selector: ".article-content, [class*='article-content'], [class*='article_content'], .article_body", verified: true },
    { selector: ".entry-content, [class*='entry-content'], .entry_content", verified: true },
    { selector: ".content-body, [class*='content-body'], .content_body", verified: true },
    { selector: ".markdown-body", verified: true },
    { selector: ".blog-post, .post-body, .article-body, .view-content, .post-view", verified: true },
    { selector: ".notion-page-content, [data-testid*='post-content']", verified: true },
    { selector: ".tui-editor-contents, .toastui-editor-contents", verified: true },
  ];
  let chosen = $("body");
  let supported = false;
  let bestLength = 0;
  for (const { selector, verified } of selectors) {
    $(selector).each((_, element) => {
      const length = $(element).text().replace(/\s+/g, " ").trim().length;
      if (length > bestLength) {
        chosen = $(element).first() as typeof chosen;
        bestLength = length;
        supported = verified;
      }
    });
  }

  // 선택자로 유의미한 본문을 찾지 못한 경우, 본문 단락이 밀집된 컨테이너 탐색
  if (bestLength < MIN_ARTICLE_CHARS) {
    $("div, section").each((_, element) => {
      const length = $(element).text().replace(/\s+/g, " ").trim().length;
      if (length > bestLength) {
        chosen = $(element).first() as typeof chosen;
        bestLength = length;
        supported = false;
      }
    });
  }

  const blocks = chosen.find("h1,h2,h3,h4,p,li,pre,blockquote,td,th").toArray()
    .map((element) => $(element).text().replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);
  const text = (blocks.length > 0 ? blocks.join("\n") : chosen.text())
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return {
    text: text.slice(0, MAX_ARTICLE_CHARS),
    supported,
    blocked: false,
    truncated: text.length > MAX_ARTICLE_CHARS,
  };
}

export async function extractArticleContent(rawUrl: string): Promise<ExtractedArticleContent> {
  try {
    const responseBuffer = await fetchHtmlWithSafeRedirects(rawUrl);
    const result = extractMainText(responseBuffer.toString("utf8"));
    if (result.blocked) return { status: "blocked", text: null, reason: "access_wall_detected" };
    if (result.text.length < MIN_ARTICLE_CHARS) return { status: "insufficient", text: null, reason: "article_body_too_short" };
    return { status: result.supported && !result.truncated ? "supported" : "partial", text: result.text, reason: result.truncated ? "article_body_truncated" : null };
  } catch (error) {
    if (error instanceof ArticleFetchError) return { status: error.status, text: null, reason: error.message };
    return { status: "failed", text: null, reason: error instanceof Error && error.message === "fetch_timeout" ? "fetch_timeout" : "fetch_failed" };
  }
}
