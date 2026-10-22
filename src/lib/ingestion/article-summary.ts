import "server-only";

export const ARTICLE_SUMMARY_MODEL = "gpt-5.6-luna";
export const ARTICLE_SUMMARY_PROMPT_VERSION = "2026-10-22-plain-korean-v1";
export const LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION = "2026-10-21-full-article-v1";
export const EARLIEST_ARTICLE_SUMMARY_PROMPT_VERSION = "2026-10-20-excerpt-v2";
export const ARTICLE_SUMMARY_MAX_INPUT_CHARS = 40_000;
export const ARTICLE_SUMMARY_MIN_INPUT_CHARS = 200;

export interface ArticleSummaryContent {
  lead: string;
  keyPoints: string[];
}

export interface GeneratedArticleSummary {
  content: ArticleSummaryContent;
  inputTokens: number | null;
  outputTokens: number | null;
}

export type ArticleSummaryScope = "full" | "partial";

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    lead: { type: "string" },
    key_points: { type: "array", items: { type: "string" } },
  },
  required: ["lead", "key_points"],
  additionalProperties: false,
} as const;

export function isArticleSummaryEnabled(): boolean {
  return process.env.OPENAI_SUMMARY_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY);
}

function extractOutputText(response: Record<string, unknown>): string | null {
  if (typeof response.output_text === "string") return response.output_text;
  const output = response.output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!item || typeof item !== "object" || !Array.isArray((item as { content?: unknown }).content)) continue;
    for (const content of (item as { content: unknown[] }).content) {
      if (content && typeof content === "object" && (content as { type?: unknown }).type === "output_text" && typeof (content as { text?: unknown }).text === "string") {
        return (content as { text: string }).text;
      }
    }
  }
  return null;
}

export async function generateArticleSummary(
  title: string,
  articleText: string,
  scope: ArticleSummaryScope = "full"
): Promise<GeneratedArticleSummary | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const safeTitle = title.trim().slice(0, 300);
  const sourceText = articleText.trim().slice(0, ARTICLE_SUMMARY_MAX_INPUT_CHARS);
  if (sourceText.length < ARTICLE_SUMMARY_MIN_INPUT_CHARS) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: ARTICLE_SUMMARY_MODEL,
      reasoning: { effort: "none" },
      text: {
        verbosity: "low",
        format: { type: "json_schema", name: "article_summary", strict: true, schema: SUMMARY_SCHEMA },
      },
      max_output_tokens: 500,
      store: false,
      instructions:
        "기술 블로그 글을 읽는 모든 독자(주니어부터 비개발 직군까지)가 쉽게 이해할 수 있도록 [문제 정의 ➔ 기술적 해결책 ➔ 실무 교훈/주의점] 3단계 요약을 친절하고 명확한 한국어로 작성한다.\n" +
        "핵심 원칙:\n" +
        "- 난해한 전문 용어나 영어 약어만을 단편적으로 나열하지 말고, 무엇을 왜 어떻게 해결했는지 누구나 직관적으로 알 수 있게 쉬운 일상적 표현과 핵심 원리를 풀어서 설명한다.\n" +
        "- 필수적인 기술명(예: Kafka, Docker 등)을 언급하더라도, 그것이 이 글에서 어떤 역할을 하는지 알기 쉽게 보충한다.\n" +
        "- 딱딱한 기계 번역투나 과도한 명사형 축약을 피하고, 자연스럽고 부드럽게 읽히는 평서문으로 작성한다.\n" +
        "- 제공된 본문만 철저히 근거로 삼고 없는 사실이나 수치를 지어내지 않는다.\n\n" +
        "작성 항목:\n" +
        "1. lead: 글 전체의 핵심 주제와 목적을 전문 용어를 최대한 지양하고 누구나 한눈에 파악할 수 있도록 쉽게 풀어낸 완성된 1문장.\n" +
        "2. key_points: 반드시 다음 순서대로 정확히 3개 항목으로 작성한다:\n" +
        "- 1번째(문제 & 배경): 어떤 상황에서 어떤 기술적 어려움이나 운영상의 불편/문제점을 겪었는지 알기 쉽게 설명한 1문장.\n" +
        "- 2번째(기술 & 해결책): 기술 스택 이름만 나열하지 않고, 그 기술이나 접근법으로 무엇을 어떻게 고쳤는지 핵심 원리와 동작 방식을 이해하기 쉽게 풀어낸 1문장.\n" +
        "- 3번째(교훈 & 주의점): 실제로 얻은 구체적인 개선 효과, 배운 점, 또는 실무에서 주의해야 할 핵심 포인트를 친절하게 정리한 1문장.\n" +
        (scope === "partial" ? "본문 일부만 추출됐을 수 있으므로 확인 가능한 내용만 작성한다." : ""),
      input: `제목: ${safeTitle}\n\n${scope === "partial" ? "원문에서 추출한 본문 일부" : "원문에서 추출한 본문"}:\n${sourceText}`,
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    console.error("OpenAI article summary failed:", response.status);
    return null;
  }
  const data = await response.json() as Record<string, unknown>;
  const outputText = extractOutputText(data);
  if (!outputText) return null;
  try {
    const parsed = JSON.parse(outputText) as { lead?: unknown; key_points?: unknown };
    const lead = typeof parsed.lead === "string" ? parsed.lead.trim() : "";
    const keyPoints = Array.isArray(parsed.key_points)
      ? parsed.key_points.filter((point): point is string => typeof point === "string").map((point) => point.trim()).filter(Boolean).slice(0, 3)
      : [];
    if (!lead || keyPoints.length < 2) return null;
    const usage = data.usage && typeof data.usage === "object" ? data.usage as Record<string, unknown> : {};
    return {
      content: { lead: lead.slice(0, 240), keyPoints: keyPoints.map((point) => point.slice(0, 300)) },
      inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : null,
      outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : null,
    };
  } catch {
    console.error("OpenAI article summary returned invalid JSON");
    return null;
  }
}
