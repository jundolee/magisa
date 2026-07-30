import "server-only";
import * as cheerio from "cheerio";
import type { ScrapeConfig } from "./types";
import { INGESTION_USER_AGENT } from "./user-agent";

const USER_AGENT = INGESTION_USER_AGENT;
const FETCH_TIMEOUT_MS = 15_000;
const AI_TIMEOUT_MS = 30_000;
const MAX_HTML_CHARS = 20_000;
const MODEL = "gpt-5-nano";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    found: {
      type: "boolean",
      description: "이 HTML에서 반복되는 글 목록 아이템을 찾을 수 있으면 true, JS로 렌더링되는 빈 껍데기이거나 목록이 없으면 false",
    },
    listItemSelector: { type: ["string", "null"], description: "글 목록의 각 아이템을 가리키는 CSS 선택자" },
    titleSelector: { type: ["string", "null"], description: "listItemSelector 기준 상대 CSS 선택자, 제목 텍스트" },
    linkSelector: {
      type: ["string", "null"],
      description: "listItemSelector 기준 상대 CSS 선택자, 글 링크(a 태그). 목록 아이템 자체가 <a>면 null",
    },
    linkAttr: { type: ["string", "null"], description: "링크 URL이 담긴 속성명. 보통 null(href 기본값)" },
    excerptSelector: { type: ["string", "null"], description: "요약/발췌 텍스트의 상대 CSS 선택자" },
    dateSelector: { type: ["string", "null"], description: "발행일의 상대 CSS 선택자" },
    thumbnailSelector: { type: ["string", "null"], description: "썸네일 이미지(img)의 상대 CSS 선택자" },
    thumbnailAttr: { type: ["string", "null"], description: "썸네일 URL이 담긴 속성명. 보통 null(src 기본값)" },
  },
  required: [
    "found",
    "listItemSelector",
    "titleSelector",
    "linkSelector",
    "linkAttr",
    "excerptSelector",
    "dateSelector",
    "thumbnailSelector",
    "thumbnailAttr",
  ],
  additionalProperties: false,
} as const;

interface AiResponse {
  found: boolean;
  listItemSelector: string | null;
  titleSelector: string | null;
  linkSelector: string | null;
  linkAttr: string | null;
  excerptSelector: string | null;
  dateSelector: string | null;
  thumbnailSelector: string | null;
  thumbnailAttr: string | null;
}

/** 토큰 비용을 줄이기 위해 스크립트/스타일 등을 제거하고 앞부분만 남긴다. */
function cleanHtmlForPrompt(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, head, link, meta").remove();
  const body = $("body").html() ?? "";
  return body.slice(0, MAX_HTML_CHARS);
}

/**
 * 규칙 기반 auto-detect(auto-detect-scrape-config.ts)가 실패했을 때만 호출하는 최후 폴백.
 * 소스 등록 시 auto-detect 실패 시 1회만 호출되며, 이후 일일 수집에서는 저장된 scrape_config를
 * 그대로 재사용하므로 다시 호출되지 않는다 (docs/decisions.md 참고).
 * OPENAI_API_KEY가 설정되어 있지 않으면 조용히 null을 반환해 폴백 없이 동작한다.
 */
export async function inferScrapeConfigWithAI(siteUrl: string): Promise<ScrapeConfig | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const pageRes = await fetch(siteUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!pageRes.ok) return null;

  const html = cleanHtmlForPrompt(await pageRes.text());
  if (!html.trim()) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "너는 블로그 글 목록 페이지의 HTML을 보고 CSS 선택자를 추론하는 도구다. " +
            "listItemSelector로 잡히는 각 엘리먼트를 기준으로, 나머지 선택자는 그 엘리먼트 내부의 상대 선택자여야 한다. " +
            "실제로 반복되는 글 목록을 찾을 수 없으면(예: 내용이 비어있는 SPA 껍데기, 목록이 아닌 단일 글 페이지) found를 false로 답해라.",
        },
        { role: "user", content: `다음은 ${siteUrl} 페이지의 정리된 HTML(body 일부)이다:\n\n${html}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "scrape_config", strict: true, schema: RESPONSE_SCHEMA },
      },
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });

  if (!res.ok) {
    console.error("AI 선택자 추론 API 호출 실패:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  let parsed: AiResponse;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  if (!parsed.found || !parsed.listItemSelector || !parsed.titleSelector) return null;

  return {
    listItemSelector: parsed.listItemSelector,
    titleSelector: parsed.titleSelector,
    linkSelector: parsed.linkSelector ?? undefined,
    linkAttr: parsed.linkAttr ?? undefined,
    excerptSelector: parsed.excerptSelector ?? undefined,
    dateSelector: parsed.dateSelector ?? undefined,
    thumbnailSelector: parsed.thumbnailSelector ?? undefined,
    thumbnailAttr: parsed.thumbnailAttr ?? undefined,
  };
}
