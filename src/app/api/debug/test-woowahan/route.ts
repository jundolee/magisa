import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { INGESTION_USER_AGENT } from "@/lib/ingestion/user-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check outbound IP from Vercel
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    results.outboundIp = await ipRes.json();
  } catch (e) {
    results.outboundIpError = String(e);
  }

  // 2. Test fetch() with INGESTION_USER_AGENT on homepage
  try {
    const r1 = await fetch("https://techblog.woowahan.com/", {
      headers: { "User-Agent": INGESTION_USER_AGENT, Accept: "*/*" },
    });
    results.fetchHomepage = { status: r1.status, headers: Object.fromEntries(r1.headers.entries()) };
  } catch (e) {
    results.fetchHomepageError = String(e);
  }

  // 3. Test fetch() with INGESTION_USER_AGENT on /feed/
  try {
    const r2 = await fetch("https://techblog.woowahan.com/feed/", {
      headers: { "User-Agent": INGESTION_USER_AGENT, Accept: "*/*" },
    });
    const text2 = await r2.text();
    results.fetchFeed = {
      status: r2.status,
      headers: Object.fromEntries(r2.headers.entries()),
      preview: text2.slice(0, 200),
    };
  } catch (e) {
    results.fetchFeedError = String(e);
  }

  // 4. Test fetch() with NO User-Agent on /feed/
  try {
    const r3 = await fetch("https://techblog.woowahan.com/feed/");
    results.fetchFeedNoUA = { status: r3.status };
  } catch (e) {
    results.fetchFeedNoUAError = String(e);
  }

  // 5. Test rss-parser parseURL
  try {
    const parser = new Parser({
      timeout: 10_000,
      headers: {
        "User-Agent": INGESTION_USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    const feed = await parser.parseURL("https://techblog.woowahan.com/feed/");
    results.rssParserParseURL = { ok: true, title: feed.title, items: feed.items?.length };
  } catch (e) {
    results.rssParserParseURLError = String(e);
  }

  // 6. Test fetch() -> parser.parseString()
  try {
    const res = await fetch("https://techblog.woowahan.com/feed/", {
      headers: { "User-Agent": INGESTION_USER_AGENT, Accept: "*/*" },
    });
    if (res.ok) {
      const xml = await res.text();
      const parser = new Parser();
      const feed = await parser.parseString(xml);
      results.fetchThenParseString = { ok: true, title: feed.title, items: feed.items?.length };
    } else {
      results.fetchThenParseString = { ok: false, status: res.status };
    }
  } catch (e) {
    results.fetchThenParseStringError = String(e);
  }

  return NextResponse.json(results);
}
