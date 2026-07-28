"use server";

import { revalidatePath } from "next/cache";
import { addSourcesBulk, deleteSource, insertSource, setSourceActive } from "@/lib/data/sources";
import { discoverFeed } from "@/lib/ingestion/discover-feed";
import { parseFeed } from "@/lib/ingestion/parse-feed";
import { scrapeSource } from "@/lib/ingestion/scrape-source";
import { autoDetectScrapeConfig } from "@/lib/ingestion/auto-detect-scrape-config";
import type { FeedType, NormalizedArticle, ScrapeConfig } from "@/lib/ingestion/types";

export interface AddSourceFlowState {
  ok: boolean;
  message: string;
  step: "idle" | "previewed";
  siteUrl: string;
  feedType: FeedType;
  feedUrl: string | null;
  scrapeConfigJson: string;
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
  scrapeConfigJson: "",
  preview: [],
};

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
      try {
        scrapeConfig = JSON.parse(String(formData.get("scrapeConfigJson") ?? "")) as ScrapeConfig;
      } catch {
        return { ...prevState, ok: false, message: "저장 실패: 스크래핑 설정 JSON 형식이 올바르지 않습니다." };
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
      message: `${discovery.feedType.toUpperCase()} 피드를 찾았어요 (${articles.length}개 글 확인됨). 내용을 확인하고 등록해주세요.`,
      step: "previewed",
      siteUrl,
      feedType: discovery.feedType,
      feedUrl: discovery.feedUrl,
      scrapeConfigJson: "",
      preview: articles.slice(0, 5),
    };
  }

  // RSS/Atom을 못 찾음 -> 스크래핑. 이미 (재)입력된 설정이 있으면 그걸 우선 사용, 없으면 자동 인식 시도.
  const manualConfigRaw = String(formData.get("scrapeConfigJson") ?? "").trim();
  let scrapeConfig: ScrapeConfig | null = null;
  let autoDetected = false;

  if (manualConfigRaw) {
    try {
      scrapeConfig = JSON.parse(manualConfigRaw) as ScrapeConfig;
    } catch {
      return {
        ok: false,
        message: "스크래핑 설정 JSON 형식이 올바르지 않습니다.",
        step: "previewed",
        siteUrl,
        feedType: "scrape",
        feedUrl: null,
        scrapeConfigJson: manualConfigRaw,
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
      message: "RSS도 없고 목록 구조 자동 인식도 실패했어요. 아래에 스크래핑 설정을 직접 입력한 뒤 다시 미리보기 해주세요.",
      step: "previewed",
      siteUrl,
      feedType: "scrape",
      feedUrl: null,
      scrapeConfigJson: "",
      preview: [],
    };
  }

  try {
    const articles = await scrapeSource(siteUrl, scrapeConfig);
    return {
      ok: articles.length > 0,
      message:
        articles.length === 0
          ? "설정대로 시도했지만 글을 하나도 찾지 못했어요. 설정을 수정해서 다시 미리보기 해주세요."
          : autoDetected
            ? `자동으로 추론한 설정으로 ${articles.length}개 글을 찾았어요. 맞는지 확인 후 등록해주세요.`
            : `입력한 설정으로 ${articles.length}개 글을 찾았어요. 맞는지 확인 후 등록해주세요.`,
      step: "previewed",
      siteUrl,
      feedType: "scrape",
      feedUrl: null,
      scrapeConfigJson: JSON.stringify(scrapeConfig, null, 2),
      preview: articles.slice(0, 5),
    };
  } catch (e) {
    return {
      ok: false,
      message: `미리보기 실패: ${e instanceof Error ? e.message : String(e)}`,
      step: "previewed",
      siteUrl,
      feedType: "scrape",
      feedUrl: null,
      scrapeConfigJson: JSON.stringify(scrapeConfig, null, 2),
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
