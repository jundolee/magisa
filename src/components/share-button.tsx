"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { SITE_NAME } from "@/app/seo";

export function ShareButton({
  title,
  url,
  size = "xsmall",
  variant,
  style,
}: {
  title: string;
  url: string;
  size?: "xsmall" | "small" | "medium";
  variant?: "ghost" | "neutralWeak" | "neutralOutline" | "neutralSolid" | "brandOutline";
  style?: React.CSSProperties;
}) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // 클립보드 API 권한 차단 또는 비보안 컨텍스트 시 execCommand fallback으로 계속 진행
      }
    }

    // 구형 브라우저 및 인앱 브라우저(카카오톡, 인스타그램 등)를 위한 fallback
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    } catch {
      return false;
    }
  }

  async function handleShare() {
    const fullUrl = typeof window !== "undefined" && !url.startsWith("http")
      ? `${window.location.origin}${url}`
      : url;
    const shareText = `${title} (via ${SITE_NAME})`;

    // 1. 모바일 등 Web Share API 지원 브라우저
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareText,
          text: title,
          url: fullUrl,
        });
        return;
      } catch (err: unknown) {
        // 사용자가 공유 창을 직접 닫거나 취소한 경우(AbortError)에는 복사 전환 없이 종료
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        // NotAllowedError 또는 데스크톱 브라우저 미지원 등으로 실패한 경우 아래 클립보드 복사로 fallback
      }
    }

    // 2. 데스크톱 및 Web Share 실패 시 클립보드 복사 실행
    const success = await copyToClipboard(fullUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <ActionButton
      type="button"
      variant={copied ? "neutralSolid" : (variant ?? "ghost")}
      size={size}
      onClick={handleShare}
      style={{
        transition: "all 0.15s ease",
        color: copied ? "#fff" : undefined,
        touchAction: "manipulation",
        ...style,
      }}
    >
      {copied ? "✓ 링크 복사됨" : "공유"}
    </ActionButton>
  );
}
