import { runSummaryJobs } from "@/lib/ingestion/run-summary-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const result = await runSummaryJobs(8);
    return Response.json({ ok: result.failed === 0, ...result });
  } catch (error) {
    console.error("Summary worker request failed:", error);
    return Response.json({ ok: false, error: "summary_worker_failed" }, { status: 500 });
  }
}
