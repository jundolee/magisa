"use server";

import { revalidatePath } from "next/cache";
import { addSourcesBulk, deleteSource, insertSource, setSourceActive } from "@/lib/data/sources";
import { discoverFeed } from "@/lib/ingestion/discover-feed";
import { parseFeed } from "@/lib/ingestion/parse-feed";
import { scrapeSource } from "@/lib/ingestion/scrape-source";
import { autoDetectScrapeConfig } from "@/lib/ingestion/auto-detect-scrape-config";
import { ingestSource, type SourceRow } from "@/lib/ingestion/ingest-source";
import { createServiceClient } from "@/lib/supabase/service";
import type { FeedType, NormalizedArticle, ScrapeConfig } from "@/lib/ingestion/types";

export interface AddSourceFlowState {
  ok: boolean;
  message: string;
  step: "idle" | "previewed";
  siteUrl: string;
  feedType: FeedType;
  feedUrl: string | null;
  // JSON을 직접 쓰게 하는 대신, 셀렉터별로 나뉜 폼 입력을 그대로 구조화해서 들고 있는다 (JSON 문법 오류 자체를 없앰).
  scrapeConfig: ScrapeConfig | null;
  preview: NormalizedArticle[];
}

// "use server" 파일은 async 함수만 export할 수 있어 상수는 내보내지 않는다 (add-source-form.tsx에 자체적으로 정의됨).
const emptyState: AddSourceFlowState = {
  ok: true,
  message: "",
  step: "idle",
  siteUrl: "",
  feedType: "unknown",
  feedUrl: null,
  scrapeConfig: null,
  preview: [],
};

const SCRAPE_FIELD_NAMES = [
  "listItemSelector",
  "titleSelector",
  "linkSelector",
  "excerptSelector",
  "dateSelector",
  "thumbnailSelector",
] as const;

/** 스크래핑 설정 폼 필드(셀렉터별 입력)에서 ScrapeConfig를 구성한다. JSON 파싱이 필요 없다. */
function scrapeConfigFromFormData(formData: FormData): ScrapeConfig | null {
  const listItemSelector = String(formData.get("listItemSelector") ?? "").trim();
  const titleSelector = String(formData.get("titleSelector") ?? "").trim();
  if (!listItemSelector || !titleSelector) return null;

  const optional = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value || undefined;
  };

  return {
    listItemSelector,
    titleSelector,
    linkSelector: optional("linkSelector"),
    excerptSelector: optional("excerptSelector"),
    dateSelector: optional("dateSelector"),
    thumbnailSelector: optional("thumbnailSelector"),
  };
}

/** 폼에 셀렉터 필드가 하나라도 실제로 채워져 있었는지 (= 사용자가 직접 입력/수정했는지) 확인 */
function hasManualScrapeFields(formData: FormData): boolean {
  return SCRAPE_FIELD_NAMES.some((name) => String(formData.get(name) ?? "").trim().length > 0);
}

/**
 * 소스 등록을 "미리보기 -> 확인 후 저장" 2단계로 나눈 서버 액션.
 * RSS/Atom을 못 찾으면 auto-detect로 스크래핑 설정을 추론해 바로 미리보기까지 보여주고,
 * 실제 저장(intent=confirm)은 사용자가 미리보기 결과를 보고 확정한 뒤에만 일어난다.
 * (docs/decisions.md: 자동 탐지 + 미리보기로 등록 난이도를 낮춘 결정 참고)
 */
export async function addSourceFlowAction(
  prevState: AddSourceFlowState,
  formData: FormData
): Promise<AddSourceFlowState> {
  const intent = String(formData.get("intent") ?? "preview");
  const siteUrl = String(formData.get("siteUrl") ?? "").trim();

  if (intent === "confirm") {
    if (!siteUrl) return { ...emptyState, ok: false, message: "사이트 URL을 입력해주세요." };

    const feedType = (String(formData.get("feedType") ?? prevState.feedType) || "unknown") as FeedType;
    const feedUrl = String(formData.get("feedUrl") ?? "") || null;

    let scrapeConfig: ScrapeConfig | null = null;
    if (feedType === "scrape") {
      scrapeConfig = scrapeConfigFromFormData(formData);
      if (!scrapeConfig) {
        return { ...prevState, ok: false, message: "저장 실패: 목록/제목 선택자는 필수입니다." };
      }
    }

    const result = await insertSource({ siteUrl, feedType, feedUrl, scrapeConfig });
    revalidatePath("/sources");
    return { ...emptyState, ok: result.ok, message: result.message };
  }

  // intent === "preview"
  if (!siteUrl) {
    return { ...emptyState, ok: false, message: "사이트 URL을 입력해주세요." };
  }

  const discovery = await discoverFeed(siteUrl).catch(() => ({ feedUrl: null, feedType: "unknown" as FeedType }));

  if (discovery.feedType === "rss" || discovery.feedType === "atom") {
    const articles = await parseFeed(discovery.feedUrl!);
    return {
      ok: true,
      message: `${articles.length}개의 글을 찾았어요. 확인하고 등록해주세요.`,
      step: "previewed",
      siteUrl,
      feedType: discovery.feedType,
      feedUrl: discovery.feedUrl,
      scrapeConfig: null,
      preview: articles.slice(0, 5),
    };
  }

  // RSS/Atom을 못 찾음 -> 스크래핑. 사용자가 필드를 직접 채웠으면 그걸 우선 사용, 비어있으면 자동 인식 시도.
  let scrapeConfig: ScrapeConfig | null = null;
  let autoDetected = false;

  if (hasManualScrapeFields(formData)) {
    scrapeConfig = scrapeConfigFromFormData(formData);
    if (!scrapeConfig) {
      return {
        ok: false,
        message: "목록 선택자와 제목 선택자는 필수입니다.",
        step: "previewed",
        siteUrl,
        feedType: "scrape",
        feedUrl: null,
        scrapeConfig: null,
        preview: [],
      };
    }
  } else {
    scrapeConfig = await autoDetectScrapeConfig(siteUrl).catch(() => null);
    autoDetected = true;
  }

  if (!scrapeConfig) {
    return {
      ok: false,
      message: "이 사이트에서는 새 글 목록을 자동으로 찾지 못했어요. 아래에서 직접 지정해볼 수 있어요.",
      step: "previewed",
      siteUrl,
      feedType: "scrape",
      feedUrl: null,
      scrapeConfig: null,
      preview: [],
    };
  }

  try {
    const articles = await scrapeSource(siteUrl, scrapeConfig);
    return {
      ok: articles.length > 0,
      message:
        articles.length === 0
          ? "글을 하나도 찾지 못했어요. 아래에서 직접 지정해볼 수 있어요."
          : autoDetected
            ? `${articles.length}개의 글을 찾았어요. 확인하고 등록해주세요.`
            : `${articles.length}개의 글을 찾았어요. 확인하고 등록해주세요.`,
      step: "previewed",
      siteUrl,
      feedType: "scrape",
      feedUrl: null,
      scrapeConfig,
      preview: articles.slice(0, 5),
    };
  } catch (e) {
    console.error("스크래핑 미리보기 실패:", e);
    return {
      ok: false,
      message: "이 사이트에서는 글을 가져오지 못했어요. 아래에서 직접 지정해볼 수 있어요.",
      step: "previewed",
      siteUrl,
      feedType: "scrape",
      feedUrl: null,
      scrapeConfig,
      preview: [],
    };
  }
}

export interface BulkAddActionState {
  total: number;
  succeeded: number;
  failed: { siteUrl: string; message: string }[];
}

export async function addSourcesBulkAction(
  _prevState: BulkAddActionState | null,
  formData: FormData
): Promise<BulkAddActionState> {
  const raw = String(formData.get("urls") ?? "");
  const urls = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    return { total: 0, succeeded: 0, failed: [] };
  }

  const results = await addSourcesBulk(urls);
  revalidatePath("/sources");

  return {
    total: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).map((r) => ({ siteUrl: r.siteUrl, message: r.message })),
  };
}

export async function toggleSourceActiveAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("nextActive") === "true";
  if (!id) return;
  await setSourceActive(id, nextActive);
  revalidatePath("/sources");
}

export async function deleteSourceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteSource(id);
  revalidatePath("/sources");
}

export interface IngestNowState {
  ok: boolean;
  message: string;
}

/**
 * 크론(매일 1회)을 기다리지 않고 특정 소스 하나를 지금 바로 수집한다.
 * 등록 직후 "다음날까지 기다려야 하나"는 피드백을 받아 추가함 (docs/decisions.md 참고).
 */
export async function ingestSourceNowAction(
  _prevState: IngestNowState,
  formData: FormData
): Promise<IngestNowState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "잘못된 요청입니다." };

  const supabase = createServiceClient();
  const { data: source, error } = await supabase
    .from("sources")
    .select("id, site_url, feed_url, feed_type, scrape_config")
    .eq("id", id)
    .single();

  if (error || !source) {
    return { ok: false, message: "소스를 찾을 수 없습니다." };
  }

  const checkedAt = new Date().toISOString();
  try {
    const result = await ingestSource(supabase, source as SourceRow);
    await supabase
      .from("sources")
      .update({ last_checked_at: checkedAt, last_success_at: checkedAt, last_error: null })
      .eq("id", id);
    revalidatePath("/sources");
    revalidatePath("/");
    return {
      ok: true,
      message:
        result.inserted > 0
          ? `새 글 ${result.inserted}개를 가져왔어요.`
          : "확인했지만 새 글은 없었어요.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("sources").update({ last_checked_at: checkedAt, last_error: message }).eq("id", id);
    revalidatePath("/sources");
    return { ok: false, message: "수집에 실패했어요." };
  }
}
