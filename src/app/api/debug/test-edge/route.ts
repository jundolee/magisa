import { NextResponse } from "next/server";
import { INGESTION_USER_AGENT } from "@/lib/ingestion/user-agent";

export const runtime = "edge";
export const preferredRegion = "icn1";

export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    results.outboundIp = await ipRes.json();
  } catch (e) {
    results.outboundIpError = String(e);
  }

  try {
    const r = await fetch("https://techblog.woowahan.com/feed/", {
      headers: { "User-Agent": INGESTION_USER_AGENT, Accept: "*/*" },
    });
    const text = await r.text();
    results.edgeFeedFetch = {
      status: r.status,
      headers: Object.fromEntries(r.headers.entries()),
      preview: text.slice(0, 200),
    };
  } catch (e) {
    results.edgeFeedFetchError = String(e);
  }

  return NextResponse.json(results);
}
