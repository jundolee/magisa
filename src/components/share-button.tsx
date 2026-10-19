"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { SITE_NAME } from "@/app/seo";

// 원문 링크와 서비스 이름을 함께 공유해 원문을 통해 들어온 사람도 서비스를 알 수 있게 한다.
export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareText = `${title} (via ${SITE_NAME})`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareText, url });
      } catch {
        // 사용자가 공유 시트를 취소한 경우 — 무시
      }
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <ActionButton type="button" variant="ghost" size="xsmall" onClick={handleShare}>
      {copied ? "복사됨" : "공유"}
    </ActionButton>
  );
}
