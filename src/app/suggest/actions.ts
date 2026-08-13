"use server";

import { redirect } from "next/navigation";
import { insertSourceSuggestion } from "@/lib/data/source-suggestions";

export async function suggestSourceAction(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!url) {
    redirect("/suggest?error=블로그 주소를 입력해주세요");
  }

  await insertSourceSuggestion(url, note || null);
  redirect("/suggest?done=1");
}
