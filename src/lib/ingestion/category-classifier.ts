import "server-only";
import { type ArticleCategory, type CategoryId, CATEGORIES } from "@/lib/categories";

export { CATEGORIES, type CategoryId, type ArticleCategory };

export interface ArticleClassificationResult {
  category: ArticleCategory;
  tags: string[];
}

const MODEL = "gpt-5-nano";
// 크론의 소스별 시간 상한(SOURCE_TIMEOUT_MS, src/app/api/cron/ingest/route.ts)과 여유를 두기 위해
// 20초에서 낮춤 — 2026-08-20에 이 호출이 소스당 최대 20초까지 걸려 크론 타임아웃의 원인이 됐던
// 것을 고친 김에(이제 새로 삽입된 글에만 호출되어 평소엔 거의 항상 몇 건 이내), 실패 시 폴백도
// 빠르게 하도록 함께 낮춤 (docs/decisions.md 참고).
const AI_TIMEOUT_MS = 12_000;

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
        "너는 IT/소프트웨어 엔지니어링 및 테크 블로그 글을 정밀 분석하여 카테고리와 핵심 기술 태그를 분류하는 시니어 테크 큐레이터 AI다.\n\n" +
        "주어진 글 각각의 제목과 요약을 분석하여, 아래 8개 표준 카테고리 중 글의 맥락에 가장 잘 맞는 단 하나의 카테고리를 선택하고, 영문 소문자 핵심 기술 태그 1~3개를 추출해라.\n\n" +
        "【카테고리 분류 기준 및 예시】\n" +
        "1. frontend: 웹 프론트엔드, React, Next.js, Vue, Svelte, JavaScript, TypeScript, CSS/Tailwind, HTML, 웹 브라우저 렌더링, Web Performance 최적화, 번들러(Vite/Webpack), UI/UX 컴포넌트, 디자인 시스템, 프론트엔드 상태관리/아키텍처\n" +
        "2. backend: 백엔드 서버, API 설계, Java/Spring, Node.js/NestJS, Go, Python/FastAPI/Django, DB 설계/쿼리 최적화, MySQL, PostgreSQL, Redis, 트랜잭션/동시성, MSA, 분산 시스템 아키텍처, 서버 성능 튜닝, 캐싱 전략\n" +
        "3. ai_ml: 인공지능, LLM(GPT, Claude, Gemini, 오픈소스 모델), AI Agent, 프롬프트 엔지니어링, RAG(검색증강생성), 벡터 DB/임베딩, LangChain, 딥러닝, 머신러닝, PyTorch, AI 서비스 개발 및 활용 사례\n" +
        "4. devops: 인프라, 클라우드(AWS, GCP, Azure), Docker, Kubernetes(K8s), CI/CD(GitHub Actions, ArgoCD), Terraform/IaC, 모니터링/로깅/알람(Grafana, Prometheus, Datadog), SRE, 서버 보안, 네트워크, 리눅스 시스템 운영\n" +
        "5. mobile: 모바일 앱 개발, iOS/Swift/SwiftUI, Android/Kotlin/Jetpack Compose, 크로스플랫폼(Flutter, React Native), 모바일 앱 성능/배포/스토어 심사, 앱 아키텍처\n" +
        "6. data: 데이터 엔지니어링, 데이터 파이프라인, Spark, Kafka, Hadoop, BigQuery, Snowflake, ETL/ELT, SQL 데이터 분석, 데이터 웨어하우스/레이크, 대용량 로그 처리\n" +
        "7. culture: 엔지니어링 조직문화, 개발자 회고(분기/연말 회고), 기술 리더십, 코드 리뷰 문화, 애자일/스크럼, 팀 빌딩, 개발자 채용/온보딩, 개발 커리어 및 성장기, 장애 회고(Post-mortem)\n" +
        "8. general: 위 7개 카테고리에 전혀 속하지 않는 일반 IT 트렌드나 테크 칼럼에만 사용 (가급적 1~7번 중 가장 연관된 카테고리를 우선 선택할 것)\n\n" +
        "【규칙】\n" +
        "- 'general' 분류는 최후의 수단으로만 사용하고, 문맥을 깊이 분석하여 1~7번 중 가장 연관된 기술 카테고리를 지정해라.\n" +
        "- 태그는 'react', 'nextjs', 'spring', 'k8s', 'llm', 'rag', 'architecture' 등 영문 소문자 단어로 1~3개 추출해라.\n" +
        "- 반드시 모든 입력 인덱스에 대해 결과를 반환해라.",
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
