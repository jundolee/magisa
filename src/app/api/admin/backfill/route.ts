import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { classifyArticlesBatch } from "@/lib/ingestion/category-classifier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const searchParams = request.nextUrl.searchParams;

  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "40", 10), 1), 60);
  const mode = searchParams.get("mode") ?? "all"; // 'all' | 'general'

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

  if (!articles || articles.length === 0) {
    return NextResponse.json({ message: "분류할 대상 글이 없습니다.", count: 0 });
  }

  const BATCH_SIZE = 20;
  const processedItems: { id: string; title: string; category: string; tags: string[] }[] = [];
  const categoryCounts: Record<string, number> = {};

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const chunk = articles.slice(i, i + BATCH_SIZE);

    // AI 배치 분류 실행 (OpenAI gpt-5-nano Structured Outputs)
    const classifications = await classifyArticlesBatch(
      chunk.map((a) => ({ title: a.title, excerpt: a.excerpt }))
    );

    await Promise.all(
      chunk.map(async (article, idx) => {
        const res = classifications[idx] ?? { category: "general" as const, tags: [] };
        categoryCounts[res.category] = (categoryCounts[res.category] ?? 0) + 1;

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

  return NextResponse.json({
    success: true,
    processedCount: processedItems.length,
    categoryCounts,
    sampleItems: processedItems.slice(0, 5),
  });
}
