import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { classifyArticleWithRules, classifyArticlesBatch } from "@/lib/ingestion/category-classifier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const supabase = createServiceClient();

  console.log("=== 아티클 일괄 카테고리 백필 API 시작 ===");

  // 전체 글 목록 조회 (최대 1000개)
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, excerpt, category, tags")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error) {
    console.error("아티클 조회 실패:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ message: "분류할 아티클이 없습니다." });
  }

  const counts: Record<string, number> = {};
  const BATCH_SIZE = 30;
  let updatedCount = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const chunk = articles.slice(i, i + BATCH_SIZE);

    // AI 분류 시도 후 실패 시 규칙 기반 분류
    let classifications;
    try {
      classifications = await classifyArticlesBatch(
        chunk.map((a) => ({ title: a.title, excerpt: a.excerpt }))
      );
    } catch {
      classifications = chunk.map((a) => classifyArticleWithRules(a.title, a.excerpt));
    }

    await Promise.all(
      chunk.map(async (article, idx) => {
        const res = classifications[idx] ?? classifyArticleWithRules(article.title, article.excerpt);
        counts[res.category] = (counts[res.category] ?? 0) + 1;

        await supabase
          .from("articles")
          .update({
            category: res.category,
            tags: res.tags,
          })
          .eq("id", article.id);
      })
    );

    updatedCount += chunk.length;
  }

  return NextResponse.json({
    success: true,
    totalArticles: articles.length,
    updatedCount,
    categoryCounts: counts,
  });
}
