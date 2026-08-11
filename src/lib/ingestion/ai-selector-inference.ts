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
function cleanHtmlForPrompt(rawHtml: string): string {
  const $ = cheerio.load(rawHtml);
  $("script, style, noscript, svg, head, link, meta").remove();
  const body = $("body").html() ?? "";
  return body.slice(0, MAX_HTML_CHARS);
}

/** 원본 페이지(잘리지 않은 전체 HTML) 기준으로 실제 이 selector들이 뭔가를 찾아내는지 확인한다. */
function validatesAgainstPage(rawHtml: string, config: AiResponse): boolean {
  if (!config.listItemSelector || !config.titleSelector) return false;
  try {
    const $ = cheerio.load(rawHtml);
    const items = $(config.listItemSelector);
    if (items.length === 0) return false;
    const firstTitle = items.first().find(config.titleSelector).first().text().trim();
    return firstTitle.length > 0;
  } catch {
    return false;
  }
}

async function callModel(
  apiKey: string,
  siteUrl: string,
  html: string,
  previousFailure?: AiResponse
): Promise<AiResponse | null> {
  const messages = [
    {
      role: "system",
      content:
        "너는 블로그 글 목록 페이지의 HTML을 보고 CSS 선택자를 추론하는 도구다. " +
        "listItemSelector로 잡히는 각 엘리먼트를 기준으로, 나머지 선택자는 그 엘리먼트 내부의 상대 선택자여야 한다. " +
        "같은 페이지에 '최근 글' 미리보기처럼 일부만 보여주는 위젯과 실제 전체 글 목록이 함께 있을 수 있는데, " +
        "이런 경우 항목 수가 더 많은 쪽(전체 목록)을 선택해라. " +
        "실제로 반복되는 글 목록을 찾을 수 없으면(예: 내용이 비어있는 SPA 껍데기, 목록이 아닌 단일 글 페이지) found를 false로 답해라.",
    },
    { role: "user", content: `다음은 ${siteUrl} 페이지의 정리된 HTML(body 일부)이다:\n\n${html}` },
    ...(previousFailure
      ? [
          {
            role: "user",
            content:
              `방금 준 답(${JSON.stringify(previousFailure)})의 listItemSelector 또는 titleSelector가 ` +
              `실제 HTML에서 아무것도 찾지 못했다. 위 HTML을 다시 잘 보고, 실제로 존재하는 태그/클래스 조합으로 다시 답해라.`,
          },
        ]
      : []),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      // gpt-5-nano는 기본값으로 상당한 양의 내부 추론 토큰을 쓰는 reasoning 모델이라(간단한 응답에도 수백 토큰),
      // 우리 프롬프트(최대 20,000자 HTML)에서는 이게 AI_TIMEOUT_MS(30s)를 넘겨버리는 원인이 됐음 — 실측으로 확인.
      // "minimal"로 낮추면 이런 선택자 추출 작업엔 충분하면서 지연시간과 비용 모두 크게 줄어든다.
      reasoning_effort: "minimal",
      messages,
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

  try {
    return JSON.parse(content) as AiResponse;
  } catch {
    return null;
  }
}

/**
 * 규칙 기반 auto-detect(auto-detect-scrape-config.ts)가 실패했을 때만 호출하는 최후 폴백.
 * 소스 등록 시 auto-detect 실패 시 1회만 호출되며, 이후 일일 수집에서는 저장된 scrape_config를
 * 그대로 재사용하므로 다시 호출되지 않는다 (docs/decisions.md 참고).
 * OPENAI_API_KEY가 설정되어 있지 않으면 조용히 null을 반환해 폴백 없이 동작한다.
 */
export async function inferScrapeConfigWithAI(
  siteUrl: string,
  userAgent: string = USER_AGENT
): Promise<ScrapeConfig | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const pageRes = await fetch(siteUrl, {
    headers: { "User-Agent": userAgent },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!pageRes.ok) return null;

  const rawHtml = await pageRes.text();
  const html = cleanHtmlForPrompt(rawHtml);
  if (!html.trim()) return null;

  let parsed = await callModel(apiKey, siteUrl, html);
  if (!parsed || !parsed.found || !parsed.listItemSelector || !parsed.titleSelector) return null;

  // 실제 DOM에서 안 맞는 selector를 만들어내는 경우가 있어(예: 복잡하게 중첩된 구조를 잘못 짐작),
  // 원본 페이지로 검증해보고 실패하면 그 사실을 알려주고 한 번 더 시도한다 (docs/decisions.md 참고).
  if (!validatesAgainstPage(rawHtml, parsed)) {
    const retried = await callModel(apiKey, siteUrl, html, parsed);
    if (!retried || !retried.found || !retried.listItemSelector || !retried.titleSelector) return null;
    if (!validatesAgainstPage(rawHtml, retried)) return null;
    parsed = retried;
  }

  // 위에서 이미 null이 아님을 확인했지만, 객체 프로퍼티 접근에 대한 좁혀진 타입은 중간 함수 호출을 거치며
  // 유지되지 않으므로 로컬 변수로 다시 뽑아 타입 에러를 피한다.
  const { listItemSelector, titleSelector } = parsed;
  if (!listItemSelector || !titleSelector) return null;

  return {
    listItemSelector,
    titleSelector,
    linkSelector: parsed.linkSelector ?? undefined,
    linkAttr: parsed.linkAttr ?? undefined,
    excerptSelector: parsed.excerptSelector ?? undefined,
    dateSelector: parsed.dateSelector ?? undefined,
    thumbnailSelector: parsed.thumbnailSelector ?? undefined,
    thumbnailAttr: parsed.thumbnailAttr ?? undefined,
  };
}
