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

  const uas = [
    { name: "feedly", ua: "Feedly/1.0 (+http://www.feedly.com/fetcher.html; 1 subscribers)" },
    { name: "inoreader", ua: "Mozilla/5.0 (compatible; Inoreader/1.0; +http://www.inoreader.com)" },
    { name: "googlebot", ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
    { name: "yeti", ua: "Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/bot)" },
    { name: "kakaotalk", ua: "facebookexternalhit/1.1; kakaotalk-scrap/1.0; +http://www.kakaocorp.com/main" },
    { name: "slackbot", ua: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)" },
    { name: "applebot", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)" },
    { name: "newsblur", ua: "NewsBlur Feed Fetcher - 1 subscribers - https://www.newsblur.com" },
    { name: "default_fetch", ua: "" },
  ];

  const tests: Record<string, number | string> = {};
  for (const item of uas) {
    try {
      const res = await fetch("https://techblog.woowahan.com/feed/", {
        headers: item.ua ? { "User-Agent": item.ua, Accept: "*/*" } : {},
      });
      tests[item.name] = res.status;
    } catch (e) {
      tests[item.name] = String(e);
    }
  }
  results.uaTests = tests;

  return NextResponse.json(results);
}
