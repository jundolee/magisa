import "server-only";
import { type ArticleCategory, type CategoryId, CATEGORIES } from "@/lib/categories";

export { CATEGORIES, type CategoryId, type ArticleCategory };

export interface ArticleClassificationResult {
  category: ArticleCategory;
  tags: string[];
}

const MODEL = "gpt-5-nano";
const AI_TIMEOUT_MS = 20_000;

const VALID_CATEGORIES: ArticleCategory[] = [
  "frontend",
  "backend",
  "ai_ml",
  "devops",
  "mobile",
  "data",
  "culture",
  "general",
];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer", description: "입력된 글의 0-based 인덱스" },
          category: {
            type: "string",
            enum: VALID_CATEGORIES,
            description: "글의 주제와 가장 일치하는 표준 카테고리 하나",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "관련 핵심 기술 태그 1~3개 (예: react, nextjs, spring, k8s, llm 등 소문자 영문)",
          },
        },
        required: ["index", "category", "tags"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
} as const;

interface AiResponse {
  results: {
    index: number;
    category: string;
    tags: string[];
  }[];
}

/**
 * AI 호출 실패 또는 API 키 미설정 시 사용하는 규칙 기반 카테고리 & 태그 추론기.
 */
export function classifyArticleWithRules(title: string, excerpt: string | null): ArticleClassificationResult {
  const text = `${title} ${excerpt ?? ""}`.toLowerCase();

  // 1. AI / ML
  if (
    /(llm|gpt|claude|openai|gemini|rag|prompt|agent|에이전트|생성형|머신러닝|딥러닝|pytorch|tensorflow|transformer|embedding|vector|langchain|ollama)/i.test(
      text
    )
  ) {
    const tags: string[] = [];
    if (/llm|gpt|claude|openai/i.test(text)) tags.push("llm");
    if (/rag|embedding|vector/i.test(text)) tags.push("rag");
    if (/agent|에이전트/i.test(text)) tags.push("agent");
    return { category: "ai_ml", tags: tags.length > 0 ? tags : ["ai"] };
  }

  // 2. Mobile
  if (
    /(ios|swift|swiftui|android|안드로이드|kotlin|compose|flutter|플러터|react native|리액트 네이티브|app store|앱스토어)/i.test(
      text
    )
  ) {
    const tags: string[] = [];
    if (/ios|swift/i.test(text)) tags.push("ios");
    if (/android|kotlin/i.test(text)) tags.push("android");
    if (/flutter|react native/i.test(text)) tags.push("cross-platform");
    return { category: "mobile", tags: tags.length > 0 ? tags : ["mobile"] };
  }

  // 3. DevOps / Infra
  if (
    /(kubernetes|k8s|쿠버네티스|docker|도커|aws|gcp|terraform|테라폼|ci\/cd|github actions|argo|helm|sre|모니터링|grafana|prometheus|보안|security|vpc|nginx)/i.test(
      text
    )
  ) {
    const tags: string[] = [];
    if (/k8s|kubernetes|쿠버네티스/i.test(text)) tags.push("k8s");
    if (/docker|도커/i.test(text)) tags.push("docker");
    if (/aws|gcp/i.test(text)) tags.push("cloud");
    if (/ci\/cd|github actions/i.test(text)) tags.push("cicd");
    return { category: "devops", tags: tags.length > 0 ? tags : ["infra"] };
  }

  // 4. Data / Analytics
  if (
    /(data engineering|spark|스파크|kafka|카프카|hadoop|flink|bigquery|빅쿼리|snowflake|dbt|etl|데이터 파이프라인|sql|데이터 웨어하우스|데이터 레이크)/i.test(
      text
    )
  ) {
    const tags: string[] = [];
    if (/kafka|카프카/i.test(text)) tags.push("kafka");
    if (/spark|스파크/i.test(text)) tags.push("spark");
    if (/sql|bigquery|snowflake/i.test(text)) tags.push("sql");
    return { category: "data", tags: tags.length > 0 ? tags : ["data"] };
  }

  // 5. Frontend
  if (
    /(react|리액트|next\.?js|vue|svelte|css|tailwind|html|javascript|자바스크립트|typescript|타입스크립트|web performance|웹 성능|브라우저|canvas|webgl|webpack|vite|rollup|turbopack|ui\/ux|design system|디자인 시스템)/i.test(
      text
    )
  ) {
    const tags: string[] = [];
    if (/next\.?js/i.test(text)) tags.push("nextjs");
    else if (/react|리액트/i.test(text)) tags.push("react");
    if (/typescript|타입스크립트/i.test(text)) tags.push("typescript");
    if (/css|tailwind/i.test(text)) tags.push("css");
    return { category: "frontend", tags: tags.length > 0 ? tags : ["web"] };
  }

  // 6. Backend
  if (
    /(spring|스프링|java|자바|jpa|hibernate|node\.?js|nestjs|nest|express|golang|고랭|django|fastapi|python|파이썬|mysql|postgresql|redis|mongodb|rdbms|트랜잭션|database|데이터베이스|microservice|msa|아키텍처|architecture|api|grpc|rest api)/i.test(
      text
    )
  ) {
    const tags: string[] = [];
    if (/spring|스프링|java/i.test(text)) tags.push("spring");
    if (/node|nestjs|nest/i.test(text)) tags.push("nodejs");
    if (/golang|go/i.test(text)) tags.push("go");
    if (/mysql|postgresql|redis|jpa/i.test(text)) tags.push("db");
    return { category: "backend", tags: tags.length > 0 ? tags : ["backend"] };
  }

  // 7. Culture & Career
  if (
    /(회고|조직문화|엔지니어링 리더십|팀 문화|채용|온보딩|애자일|스크럼|스프린트|코드 리뷰|코드리뷰|성장기|이직|커리어|cultur|agile|leadership|post-mortem)/i.test(
      text
    )
  ) {
    const tags: string[] = [];
    if (/회고/i.test(text)) tags.push("retrospective");
    if (/문화|팀/i.test(text)) tags.push("culture");
    if (/애자일|스크럼/i.test(text)) tags.push("agile");
    return { category: "culture", tags: tags.length > 0 ? tags : ["career"] };
  }

  return { category: "general", tags: [] };
}

/**
 * 여러 글의 제목/요약을 받아 OpenAI API로 한 번에 카테고리와 태그를 분류한다.
 * API 호출이 실패하거나 키가 없으면 규칙 기반 분류로 자동 폴백한다.
 */
export async function classifyArticlesBatch(
  items: { title: string; excerpt: string | null }[]
): Promise<ArticleClassificationResult[]> {
  if (items.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return items.map((item) => classifyArticleWithRules(item.title, item.excerpt));
  }

  const promptList = items
    .map((item, idx) => `[${idx}] 제목: ${item.title}\n요약: ${item.excerpt ?? "없음"}`)
    .join("\n\n");

  const messages = [
    {
      role: "system",
      content:
        "너는 IT/소프트웨어 엔지니어링 블로그 글을 분석하여 카테고리와 핵심 기술 태그를 분류하는 AI다.\n" +
        "주어진 글 목록 각각에 대해 다음 표준 카테고리 중 가장 적합한 하나를 선택하고, 관련 핵심 기술 태그(1~3개, 영문 소문자)를 추출해라.\n\n" +
        "표준 카테고리 목록:\n" +
        "- frontend: 웹 프론트엔드, React, Next.js, Vue, CSS, TypeScript, 브라우저 성능, UI/UX 엔지니어링\n" +
        "- backend: 백엔드 서버, Spring, Java, Node.js, Go, Python, DB, SQL, 아키텍처, MSA, API\n" +
        "- ai_ml: LLM, OpenAI, RAG, Agent, 프롬프트, 딥러닝, 머신러닝, AI 서비스\n" +
        "- devops: 인프라, Docker, Kubernetes, AWS, GCP, CI/CD, Terraform, SRE, 보안, 네트워크\n" +
        "- mobile: iOS, Android, Swift, Kotlin, Flutter, React Native, 모바일 앱\n" +
        "- data: 데이터 엔지니어링, Spark, Kafka, ETL, BigQuery, 데이터 파이프라인\n" +
        "- culture: 개발 조직문화, 회고, 애자일, 엔지니어링 리더십, 코드 리뷰, 채용, 커리어\n" +
        "- general: IT 트렌드, 일반 테크 기획, 기타 분류하기 모호한 기술 글\n\n" +
        "반드시 모든 입력 인덱스에 대해 결과를 반환해라.",
    },
    {
      role: "user",
      content: `다음 글들을 분류해라:\n\n${promptList}`,
    },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: "minimal",
        messages,
        response_format: {
          type: "json_schema",
          json_schema: { name: "article_classifications", strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn("AI 카테고리 분류 API 호출 실패, 규칙 기반 폴백:", res.status, await res.text().catch(() => ""));
      return items.map((item) => classifyArticleWithRules(item.title, item.excerpt));
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return items.map((item) => classifyArticleWithRules(item.title, item.excerpt));
    }

    const parsed = JSON.parse(content) as AiResponse;
    const resultMap = new Map<number, ArticleClassificationResult>();

    for (const r of parsed.results) {
      const cat = VALID_CATEGORIES.includes(r.category as ArticleCategory)
        ? (r.category as ArticleCategory)
        : "general";
      const tags = Array.isArray(r.tags)
        ? r.tags.map((t) => t.toLowerCase().trim().replace(/[^a-z0-9\-.]/g, "")).filter(Boolean)
        : [];
      resultMap.set(r.index, { category: cat, tags });
    }

    return items.map((item, idx) => resultMap.get(idx) ?? classifyArticleWithRules(item.title, item.excerpt));
  } catch (err) {
    console.warn("AI 카테고리 분류 중 예외 발생, 규칙 기반 폴백:", err);
    return items.map((item) => classifyArticleWithRules(item.title, item.excerpt));
  }
}
