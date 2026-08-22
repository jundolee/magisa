"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";

// 매기사 자체엔 글 본문 페이지가 없어(원문으로 바로 링크) 공유는 "원문 링크 + 매기사에서 봤다는 표시"로
// 구성한다 — 공유를 타고 들어온 사람이 매기사를 알게 되는 게 목적 (docs/growth-strategy.md 참고).
export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareText = `${title} (via 매일 읽는 테크 기사)`;

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
