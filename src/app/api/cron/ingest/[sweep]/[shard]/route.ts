import type { NextRequest } from "next/server";
import { CRON_SHARD_COUNT } from "@/lib/ingestion/cron-sharding";
import { runCronShard } from "@/lib/ingestion/run-cron-shard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sweep: string; shard: string }> }
) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { sweep, shard: rawShard } = await params;
  const shard = Number(rawShard);
  if ((sweep !== "first" && sweep !== "retry") ||
      !/^(0|[1-9]\d*)$/.test(rawShard) ||
      !Number.isInteger(shard) || shard < 0 || shard >= CRON_SHARD_COUNT) {
    return Response.json({ ok: false, error: "Invalid sweep or shard" }, { status: 400 });
  }
  return runCronShard(shard, sweep);
}
