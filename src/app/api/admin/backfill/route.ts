import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { classifyArticlesBatch } from "@/lib/ingestion/category-classifier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const searchParams = request.nextUrl.searchParams;

  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1), 100);
  const mode = searchParams.get("mode") ?? "general"; // 기본값은 아직 general인 글들을 우선 처리

  console.log(`=== AI 아티클 카테고리 백필 시작 (mode: ${mode}, limit: ${limit}) ===`);

  let query = supabase
    .from("articles")
    .select("id, title, excerpt, category, tags")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (mode === "general") {
    query = query.eq("category", "general");
  }

  const { data: articles, error } = await query.limit(limit);

  if (error) {
    console.error("아티클 조회 실패:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const BATCH_SIZE = 25;
  const processedItems: { id: string; title: string; category: string; tags: string[] }[] = [];
  const batchCounts: Record<string, number> = {};

  if (articles && articles.length > 0) {
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const chunk = articles.slice(i, i + BATCH_SIZE);

      // AI 배치 분류 실행 (OpenAI gpt-5-nano)
      const classifications = await classifyArticlesBatch(
        chunk.map((a) => ({ title: a.title, excerpt: a.excerpt }))
      );

      await Promise.all(
        chunk.map(async (article, idx) => {
          const res = classifications[idx] ?? { category: "general" as const, tags: [] };
          batchCounts[res.category] = (batchCounts[res.category] ?? 0) + 1;

          processedItems.push({
            id: article.id,
            title: article.title,
            category: res.category,
            tags: res.tags,
          });

          await supabase
            .from("articles")
            .update({
              category: res.category,
              tags: res.tags,
            })
            .eq("id", article.id);
        })
      );
    }
  }

  // 캐시 즉시 무효화 -> 실서버 화면에 최신 카테고리 즉시 반영
  try {
    revalidateTag("articles", "max");
    revalidatePath("/");
  } catch (err) {
    console.warn("revalidate error:", err);
  }

  // 전체 DB 카테고리별 현황 통계 조회
  const { data: statsData } = await supabase
    .from("articles")
    .select("category");

  const totalDistribution: Record<string, number> = {};
  if (statsData) {
    for (const row of statsData) {
      const cat = row.category ?? "general";
      totalDistribution[cat] = (totalDistribution[cat] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    success: true,
    processedInThisBatch: processedItems.length,
    batchCounts,
    totalArticlesInDB: statsData?.length ?? 0,
    totalDistribution,
    sampleItems: processedItems.slice(0, 5),
  });
}
