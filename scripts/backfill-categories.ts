import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// .env.local 로드 (무의존성)
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("오류: NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const MODEL = "gpt-5-nano";
const BATCH_SIZE = 20;

const VALID_CATEGORIES = [
  "frontend",
  "backend",
  "ai_ml",
  "devops",
  "mobile",
  "data",
  "culture",
  "general",
] as const;

type ArticleCategory = (typeof VALID_CATEGORIES)[number];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          category: {
            type: "string",
            enum: VALID_CATEGORIES,
          },
          tags: {
            type: "array",
            items: { type: "string" },
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

function classifyWithRules(title: string, excerpt: string | null): { category: ArticleCategory; tags: string[] } {
  const text = `${title} ${excerpt ?? ""}`.toLowerCase();

  if (/(llm|gpt|claude|openai|gemini|rag|prompt|agent|에이전트|생성형|머신러닝|딥러닝|pytorch|tensorflow|transformer|embedding|vector|langchain|ollama)/i.test(text)) {
    const tags: string[] = [];
    if (/llm|gpt|claude|openai/i.test(text)) tags.push("llm");
    if (/rag|embedding|vector/i.test(text)) tags.push("rag");
    if (/agent|에이전트/i.test(text)) tags.push("agent");
    return { category: "ai_ml", tags: tags.length > 0 ? tags : ["ai"] };
  }

  if (/(ios|swift|swiftui|android|안드로이드|kotlin|compose|flutter|플러터|react native|리액트 네이티브|app store|앱스토어)/i.test(text)) {
    const tags: string[] = [];
    if (/ios|swift/i.test(text)) tags.push("ios");
    if (/android|kotlin/i.test(text)) tags.push("android");
    return { category: "mobile", tags: tags.length > 0 ? tags : ["mobile"] };
  }

  if (/(kubernetes|k8s|쿠버네티스|docker|도커|aws|gcp|terraform|테라폼|ci\/cd|github actions|sre|모니터링|grafana|prometheus|보안|security)/i.test(text)) {
    const tags: string[] = [];
    if (/k8s|kubernetes|쿠버네티스/i.test(text)) tags.push("k8s");
    if (/docker|도커/i.test(text)) tags.push("docker");
    if (/aws|gcp/i.test(text)) tags.push("cloud");
    return { category: "devops", tags: tags.length > 0 ? tags : ["infra"] };
  }

  if (/(data engineering|spark|스파크|kafka|카프카|hadoop|flink|bigquery|빅쿼리|snowflake|dbt|etl|데이터 파이프라인|sql|데이터 웨어하우스)/i.test(text)) {
    const tags: string[] = [];
    if (/kafka|카프카/i.test(text)) tags.push("kafka");
    if (/spark|스파크/i.test(text)) tags.push("spark");
    return { category: "data", tags: tags.length > 0 ? tags : ["data"] };
  }

  if (/(react|리액트|next\.?js|vue|svelte|css|tailwind|html|javascript|자바스크립트|typescript|타입스크립트|web performance|웹 성능|브라우저|canvas|webgl|webpack|vite|rollup|turbopack|ui\/ux|design system|디자인 시스템)/i.test(text)) {
    const tags: string[] = [];
    if (/next\.?js/i.test(text)) tags.push("nextjs");
    else if (/react|리액트/i.test(text)) tags.push("react");
    if (/typescript|타입스크립트/i.test(text)) tags.push("typescript");
    return { category: "frontend", tags: tags.length > 0 ? tags : ["web"] };
  }

  if (/(spring|스프링|java|자바|jpa|hibernate|node\.?js|nestjs|nest|express|golang|고랭|django|fastapi|python|파이썬|mysql|postgresql|redis|mongodb|rdbms|트랜잭션|database|데이터베이스|microservice|msa|아키텍처|architecture|api|grpc)/i.test(text)) {
    const tags: string[] = [];
    if (/spring|스프링|java/i.test(text)) tags.push("spring");
    if (/node|nestjs|nest/i.test(text)) tags.push("nodejs");
    if (/golang|go/i.test(text)) tags.push("go");
    return { category: "backend", tags: tags.length > 0 ? tags : ["backend"] };
  }

  if (/(회고|조직문화|엔지니어링 리더십|팀 문화|채용|온보딩|애자일|스크럼|스프린트|코드 리뷰|코드리뷰|성장기|이직|커리어|cultur|agile|leadership)/i.test(text)) {
    const tags: string[] = [];
    if (/회고/i.test(text)) tags.push("retrospective");
    if (/문화|팀/i.test(text)) tags.push("culture");
    return { category: "culture", tags: tags.length > 0 ? tags : ["career"] };
  }

  return { category: "general", tags: [] };
}

async function classifyBatch(
  items: { title: string; excerpt: string | null }[]
): Promise<{ category: ArticleCategory; tags: string[] }[]> {
  if (!apiKey) {
    return items.map((i) => classifyWithRules(i.title, i.excerpt));
  }

  const promptList = items
    .map((item, idx) => `[${idx}] 제목: ${item.title}\n요약: ${item.excerpt ?? "없음"}`)
    .join("\n\n");

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
        messages: [
          {
            role: "system",
            content:
              "너는 IT/소프트웨어 엔지니어링 블로그 글을 분석하여 카테고리와 핵심 기술 태그를 분류하는 AI다.\n" +
              "주어진 글 목록 각각에 대해 다음 표준 카테고리 중 가장 적합한 하나를 선택하고, 관련 핵심 기술 태그(1~3개, 영문 소문자)를 추출해라.\n\n" +
              "표준 카테고리:\n" +
              "- frontend: 프론트엔드, React, Next.js, Vue, CSS, TypeScript, 웹 성능, UI/UX\n" +
              "- backend: 백엔드 서버, Spring, Java, Node.js, Go, Python, DB, SQL, 아키텍처, MSA, API\n" +
              "- ai_ml: LLM, OpenAI, RAG, Agent, 프롬프트, 딥러닝, 머신러닝, AI 서비스\n" +
              "- devops: 인프라, Docker, Kubernetes, AWS, GCP, CI/CD, Terraform, SRE, 보안\n" +
              "- mobile: iOS, Android, Swift, Kotlin, Flutter, React Native, 모바일 앱\n" +
              "- data: 데이터 엔지니어링, Spark, Kafka, ETL, BigQuery, 데이터 파이프라인\n" +
              "- culture: 조직문화, 회고, 애자일, 엔지니어링 리더십, 코드 리뷰, 채용, 커리어\n" +
              "- general: IT 트렌드, 일반 테크 기획, 기타 일반 기술 글\n\n" +
              "반드시 모든 입력 인덱스에 대해 결과를 반환해라.",
          },
          { role: "user", content: `다음 글들을 분류해라:\n\n${promptList}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "article_classifications", strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.warn("AI 호출 실패, 규칙 기반 폴백:", res.status);
      return items.map((i) => classifyWithRules(i.title, i.excerpt));
    }

    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    const resultMap = new Map<number, { category: ArticleCategory; tags: string[] }>();

    for (const r of parsed.results) {
      const cat = VALID_CATEGORIES.includes(r.category as ArticleCategory)
        ? (r.category as ArticleCategory)
        : "general";
      const tags = Array.isArray(r.tags)
        ? r.tags.map((t: string) => t.toLowerCase().trim().replace(/[^a-z0-9\-.]/g, "")).filter(Boolean)
        : [];
      resultMap.set(r.index, { category: cat, tags });
    }

    return items.map((item, idx) => resultMap.get(idx) ?? classifyWithRules(item.title, item.excerpt));
  } catch (err) {
    console.warn("AI 호출 예외, 규칙 기반 폴백:", err);
    return items.map((i) => classifyWithRules(i.title, i.excerpt));
  }
}

async function main() {
  console.log("=== 기존 아티클 카테고리 백필 시작 ===");
  console.log(`OpenAI API Key 설정 여부: ${apiKey ? "설정됨 (AI 분류)" : "미설정 (규칙 기반 분류)"}`);

  let offset = 0;
  let totalProcessed = 0;

  while (true) {
    const { data: articles, error } = await supabase
      .from("articles")
      .select("id, title, excerpt, category, tags")
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("글 조회 실패:", error);
      break;
    }

    if (!articles || articles.length === 0) {
      console.log("모든 글 조회가 완료되었습니다.");
      break;
    }

    console.log(`[${offset + 1} ~ ${offset + articles.length}] 분류 진행 중...`);

    const classifications = await classifyBatch(
      articles.map((a) => ({ title: a.title, excerpt: a.excerpt }))
    );

    await Promise.all(
      articles.map(async (article, idx) => {
        const result = classifications[idx];
        if (!result) return;
        await supabase
          .from("articles")
          .update({
            category: result.category,
            tags: result.tags,
          })
          .eq("id", article.id);
      })
    );

    totalProcessed += articles.length;
    offset += articles.length;

    console.log(`  -> ${totalProcessed}개 글 카테고리 업데이트 완료`);

    if (articles.length < BATCH_SIZE) break;

    // API Rate-limit 완화를 위한 500ms 대기
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n🎉 총 ${totalProcessed}개 글의 카테고리 백필이 완료되었습니다!`);
}

main().catch(console.error);
