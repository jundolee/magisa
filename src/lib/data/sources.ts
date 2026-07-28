import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { discoverFeed } from "@/lib/ingestion/discover-feed";
import type { FeedType, ScrapeConfig } from "@/lib/ingestion/types";

export interface Source {
  id: string;
  site_url: string;
  feed_url: string | null;
  feed_type: FeedType;
  scrape_config: ScrapeConfig | null;
  title: string | null;
  is_active: boolean;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
}

export async function listSources(): Promise<Source[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Source[];
}

export interface AddSourceResult {
  siteUrl: string;
  ok: boolean;
  message: string;
}

/**
 * 이미 확정된(discover/미리보기를 거친) 피드 정보로 소스를 바로 저장한다.
 * 재탐지 없이 그대로 insert만 수행 — addSourceFlowAction의 "confirm" 단계에서 사용.
 */
export async function insertSource(input: {
  siteUrl: string;
  feedType: FeedType;
  feedUrl: string | null;
  scrapeConfig: ScrapeConfig | null;
}): Promise<AddSourceResult> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("sources").insert({
    site_url: input.siteUrl,
    feed_url: input.feedUrl,
    feed_type: input.feedType,
    scrape_config: input.feedType === "scrape" ? input.scrapeConfig : null,
  });

  if (error) {
    return { siteUrl: input.siteUrl, ok: false, message: `등록 실패: ${error.message}` };
  }
  return {
    siteUrl: input.siteUrl,
    ok: true,
    message: input.feedType === "scrape" ? "스크래핑 방식으로 등록됨" : `${input.feedType.toUpperCase()} 피드로 등록됨`,
  };
}

/**
 * URL 하나를 등록한다 (일괄 등록 경로용). RSS/Atom을 자동탐지하면 그 결과로, 못 찾으면 scrapeConfig가 있을 때만 scrape 모드로 등록.
 * scrapeConfig 없이 피드도 못 찾으면 등록하지 않고 이유를 반환한다 — 이 경우 단건 등록의 미리보기 플로우를 이용해야 한다.
 */
export async function addSource(siteUrl: string, scrapeConfig?: ScrapeConfig): Promise<AddSourceResult> {
  const normalizedUrl = siteUrl.trim();

  let feedUrl: string | null = null;
  let feedType: FeedType = "unknown";

  try {
    const discovery = await discoverFeed(normalizedUrl);
    feedUrl = discovery.feedUrl;
    feedType = discovery.feedType;
  } catch {
    // 탐지 실패는 무시하고 unknown으로 진행 (scrapeConfig가 있으면 그걸로 등록)
  }

  if (feedType === "unknown") {
    if (!scrapeConfig) {
      return {
        siteUrl: normalizedUrl,
        ok: false,
        message: "RSS/Atom 피드를 찾지 못했습니다. 단건 등록의 '미리보기'를 이용해 다시 등록해주세요.",
      };
    }
    feedType = "scrape";
  }

  return insertSource({ siteUrl: normalizedUrl, feedType, feedUrl, scrapeConfig: scrapeConfig ?? null });
}

export async function addSourcesBulk(siteUrls: string[]): Promise<AddSourceResult[]> {
  const results: AddSourceResult[] = [];
  for (const url of siteUrls) {
    if (!url.trim()) continue;
    results.push(await addSource(url));
  }
  return results;
}

export async function setSourceActive(id: string, isActive: boolean): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("sources").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteSource(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("sources").delete().eq("id", id);
  if (error) throw error;
}
