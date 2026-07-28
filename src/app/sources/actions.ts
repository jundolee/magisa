"use server";

import { revalidatePath } from "next/cache";
import { addSource, addSourcesBulk, deleteSource, setSourceActive } from "@/lib/data/sources";
import type { ScrapeConfig } from "@/lib/ingestion/types";

export interface AddSourceActionState {
  ok: boolean;
  message: string;
}

export async function addSourceAction(
  _prevState: AddSourceActionState | null,
  formData: FormData
): Promise<AddSourceActionState> {
  const siteUrl = String(formData.get("siteUrl") ?? "").trim();
  const scrapeConfigRaw = String(formData.get("scrapeConfig") ?? "").trim();

  if (!siteUrl) {
    return { ok: false, message: "사이트 URL을 입력해주세요." };
  }

  let scrapeConfig: ScrapeConfig | undefined;
  if (scrapeConfigRaw) {
    try {
      scrapeConfig = JSON.parse(scrapeConfigRaw) as ScrapeConfig;
    } catch {
      return { ok: false, message: "스크래핑 설정 JSON 형식이 올바르지 않습니다." };
    }
  }

  const result = await addSource(siteUrl, scrapeConfig);
  revalidatePath("/sources");
  return { ok: result.ok, message: result.message };
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
