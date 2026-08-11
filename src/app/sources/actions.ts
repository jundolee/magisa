"use server";

import { revalidatePath, updateTag } from "next/cache";
import { addSourcesBulk, deleteSource, insertSource, setSourceActive } from "@/lib/data/sources";
import { discoverFeed } from "@/lib/ingestion/discover-feed";
import { parseFeed } from "@/lib/ingestion/parse-feed";
import { scrapeSource } from "@/lib/ingestion/scrape-source";
import { autoDetectScrapeConfig } from "@/lib/ingestion/auto-detect-scrape-config";
import { inferScrapeConfigWithAI } from "@/lib/ingestion/ai-selector-inference";
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
  siteTitle: string | null;
  faviconUrl: string | null;
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
  siteTitle: null,
  faviconUrl: null,
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
    linkAttr: optional("linkAttr"),
    excerptSelector: optional("excerptSelector"),
    dateSelector: optional("dateSelector"),
    thumbnailSelector: optional("thumbnailSelector"),
    thumbnailAttr: optional("thumbnailAttr"),
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
    const siteTitle = String(formData.get("siteTitle") ?? "").trim() || null;
    const faviconUrl = String(formData.get("faviconUrl") ?? "").trim() || null;

    let scrapeConfig: ScrapeConfig | null = null;
    if (feedType === "scrape") {
      scrapeConfig = scrapeConfigFromFormData(formData);
      if (!scrapeConfig) {
        return { ...prevState, ok: false, message: "저장 실패: 목록/제목 선택자는 필수입니다." };
      }
    }

    const result = await insertSource({ siteUrl, feedType, feedUrl, scrapeConfig, title: siteTitle, faviconUrl });
    revalidatePath("/sources");
    updateTag("sources");
    return { ...emptyState, ok: result.ok, message: result.message };
  }

  // intent === "preview"
  if (!siteUrl) {
    return { ...emptyState, ok: false, message: "사이트 URL을 입력해주세요." };
  }

  const discovery = await discoverFeed(siteUrl).catch(
    () => ({ feedUrl: null, feedType: "unknown" as FeedType, siteTitle: null, faviconUrl: null })
  );

  if (discovery.feedType === "rss" || discovery.feedType === "atom") {
    const feed = await parseFeed(discovery.feedUrl!).catch(() => ({ title: null, articles: [] }));
    // 피드가 있어도 항목이 0개면(예: <channel>만 있고 <item> 없는 빈 스텁 피드) 그대로 실패로 끝내지 않고
    // 아래 스크래핑/AI 폴백으로 넘어간다 — RSS URL은 있지만 내용이 비어있는 사이트가 실제로 존재함(docs/decisions.md 참고).
    if (feed.articles.length > 0) {
      return {
        ok: true,
        message: `${feed.articles.length}개의 글을 찾았어요. 확인하고 등록해주세요.`,
        step: "previewed",
        siteUrl,
        feedType: discovery.feedType,
        feedUrl: discovery.feedUrl,
        scrapeConfig: null,
        siteTitle: feed.title ?? discovery.siteTitle,
        faviconUrl: discovery.faviconUrl,
        preview: feed.articles.slice(0, 5),
      };
    }
  }

  // RSS/Atom을 못 찾음 -> 스크래핑. 사용자가 필드를 직접 채웠으면 그걸 그대로 사용.
  if (hasManualScrapeFields(formData)) {
    const scrapeConfig = scrapeConfigFromFormData(formData);
    if (!scrapeConfig) {
      return {
        ok: false,
        message: "목록 선택자와 제목 선택자는 필수입니다.",
        step: "previewed",
        siteUrl,
        feedType: "scrape",
        feedUrl: null,
        scrapeConfig: null,
        siteTitle: discovery.siteTitle,
        faviconUrl: discovery.faviconUrl,
        preview: [],
      };
    }

    const articles = await tryScrapePreview(siteUrl, scrapeConfig);
    return {
      ok: articles !== null,
      message:
        articles === null
          ? "글을 하나도 찾지 못했어요. 선택자를 다시 확인해주세요."
          : `${articles.length}개의 글을 찾았어요. 확인하고 등록해주세요.`,
      step: "previewed",
      siteUrl,
      feedType: "scrape",
      feedUrl: null,
      scrapeConfig,
      siteTitle: discovery.siteTitle,
      faviconUrl: discovery.faviconUrl,
      preview: articles?.slice(0, 5) ?? [],
    };
  }

  // 사용자가 직접 입력하지 않음 -> ① AI 추론(소스당 최대 1회 호출), ② 실패 시(OPENAI_API_KEY
  // 미설정 포함)에만 규칙 기반 auto-detect를 순서대로 시도.
  const aiConfig = await inferScrapeConfigWithAI(siteUrl).catch((e) => {
    console.error("AI 선택자 추론 실패:", e);
    return null;
  });
  const aiArticles = aiConfig ? await tryScrapePreview(siteUrl, aiConfig) : null;
  if (aiConfig && aiArticles) {
    return {
      ok: true,
      message: `${aiArticles.length}개의 글을 찾았어요. 확인하고 등록해주세요.`,
      step: "previewed",
      siteUrl,
      feedType: "scrape",
      feedUrl: null,
      scrapeConfig: aiConfig,
      siteTitle: discovery.siteTitle,
      faviconUrl: discovery.faviconUrl,
      preview: aiArticles.slice(0, 5),
    };
  }

  const autoConfig = await autoDetectScrapeConfig(siteUrl).catch(() => null);
  const autoArticles = autoConfig ? await tryScrapePreview(siteUrl, autoConfig) : null;
  if (autoConfig && autoArticles) {
    return {
      ok: true,
      message: `${autoArticles.length}개의 글을 찾았어요. 확인하고 등록해주세요.`,
      step: "previewed",
      siteUrl,
      feedType: "scrape",
      feedUrl: null,
      scrapeConfig: autoConfig,
      siteTitle: discovery.siteTitle,
      faviconUrl: discovery.faviconUrl,
      preview: autoArticles.slice(0, 5),
    };
  }

  return {
    ok: false,
    message: "이 사이트에서는 새 글 목록을 자동으로 찾지 못했어요. 아래에서 직접 지정해볼 수 있어요.",
    step: "previewed",
    siteUrl,
    feedType: "scrape",
    feedUrl: null,
    scrapeConfig: null,
    siteTitle: discovery.siteTitle,
    faviconUrl: discovery.faviconUrl,
    preview: [],
  };
}

/** scrapeConfig 후보 하나를 실제로 시도해보고, 글을 하나도 못 찾거나 에러가 나면 null. */
async function tryScrapePreview(siteUrl: string, scrapeConfig: ScrapeConfig): Promise<NormalizedArticle[] | null> {
  try {
    const articles = await scrapeSource(siteUrl, scrapeConfig);
    return articles.length > 0 ? articles : null;
  } catch (e) {
    console.error("스크래핑 미리보기 실패:", e);
    return null;
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
  updateTag("sources");

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
  updateTag("sources");
}

export async function deleteSourceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteSource(id);
  revalidatePath("/sources");
  updateTag("sources");
}

export interface IngestNowState {
  ok: boolean;
  message: string;
  inserted?: number;
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
    updateTag("sources");
    return {
      ok: true,
      message:
        result.inserted > 0
          ? `새 글 ${result.inserted}개를 가져왔어요.`
          : "확인했지만 새 글은 없었어요.",
      inserted: result.inserted,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("sources").update({ last_checked_at: checkedAt, last_error: message }).eq("id", id);
    revalidatePath("/sources");
    updateTag("sources");
    return { ok: false, message: "수집에 실패했어요." };
  }
}
