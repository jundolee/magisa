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
 * URL 하나를 등록한다. RSS/Atom을 자동탐지하면 그 결과로, 못 찾으면 scrapeConfig가 있을 때만 scrape 모드로 등록.
 * scrapeConfig 없이 피드도 못 찾으면 등록하지 않고 이유를 반환한다 (호출자가 재시도/직접 설정하도록).
 */
export async function addSource(siteUrl: string, scrapeConfig?: ScrapeConfig): Promise<AddSourceResult> {
  const supabase = createServiceClient();
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
        message: "RSS/Atom 피드를 찾지 못했습니다. 스크래핑 설정(JSON)을 입력해 다시 등록해주세요.",
      };
    }
    feedType = "scrape";
  }

  const { error } = await supabase.from("sources").insert({
    site_url: normalizedUrl,
    feed_url: feedUrl,
    feed_type: feedType,
    scrape_config: feedType === "scrape" ? scrapeConfig : null,
  });

  if (error) {
    return { siteUrl: normalizedUrl, ok: false, message: `등록 실패: ${error.message}` };
  }

  return {
    siteUrl: normalizedUrl,
    ok: true,
    message: feedType === "scrape" ? "스크래핑 방식으로 등록됨" : `${feedType.toUpperCase()} 피드로 등록됨`,
  };
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
