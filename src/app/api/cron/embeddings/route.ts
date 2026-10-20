import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { processArticleEmbeddingJobs } from "@/lib/ingestion/process-article-embedding-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rawLimit = request.nextUrl.searchParams.get("limit");
  const parsedLimit = rawLimit ? Number(rawLimit) : 200;
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
    return Response.json({ ok: false, error: "limit must be an integer between 1 and 200" }, { status: 400 });
  }

  try {
    const summary = await processArticleEmbeddingJobs(parsedLimit);
    if (summary.embeddingsIndexed > 0 || summary.vectorsDeleted > 0) {
      revalidateTag("article-related-candidates", "max");
    }
    return Response.json({ ok: true, ...summary });
  } catch (cause) {
    console.error("Article embedding cron failed:", cause instanceof Error ? cause.name : "unknown error");
    return Response.json({ ok: false, error: "Article embedding jobs could not be processed" }, { status: 500 });
  }
}
