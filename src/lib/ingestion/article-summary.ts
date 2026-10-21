import "server-only";

export const ARTICLE_SUMMARY_MODEL = "gpt-5.6-luna";
export const ARTICLE_SUMMARY_PROMPT_VERSION = "2026-10-21-full-article-v1";
export const LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION = "2026-10-20-excerpt-v2";
export const ARTICLE_SUMMARY_MAX_INPUT_CHARS = 40_000;
export const ARTICLE_SUMMARY_MIN_INPUT_CHARS = 800;

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
      max_output_tokens: 320,
      store: false,
      instructions:
        "기술 블로그 글을 읽는 엔지니어를 위해 [문제 정의 ➔ 기술적 해결책 ➔ 실무 교훈/주의점] 3단계 엔지니어링 브리핑을 간결한 한국어로 작성한다. " +
        "제공된 본문만 근거로 삼고 없는 사실이나 수치를 지어내지 않는다. " +
        "1. lead: 이 글 전체의 핵심 주제와 목적을 설명하는 완성된 1문장. " +
        "2. key_points: 반드시 다음 순서대로 정확히 3개 항목으로 작성한다: " +
        "- 1번째(문제 & 배경): 어떤 기술적 문제, 운영 이슈, 또는 요구사항에서 시작했는지 1문장 " +
        "- 2번째(기술 & 해결책): 어떤 기술 스택, 아키텍처 패턴, 또는 구체적 방법으로 해결했는지 1문장 " +
        "- 3번째(교훈 & 주의점): 실무에서 얻은 핵심 결과, 트레이드오프, 또는 주의할 점 1문장 " +
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
