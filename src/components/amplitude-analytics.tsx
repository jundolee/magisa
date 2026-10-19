"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import * as amplitude from "@amplitude/analytics-browser";

/**
 * GA4(GoogleTagManager)와 동일하게 프로덕션에서만 렌더링된다 (app/layout.tsx 참고) —
 * 로컬 개발 접속이 실제 분석 데이터에 섞이지 않도록.
 */
export function AmplitudeAnalytics() {
  const pathname = usePathname();
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

  useEffect(() => {
    if (!analyticsEnabled || !apiKey) return;
    // Autocapture includes full page URLs, which would also collect ?q= search text.
    // Explicit events below send only the pathname and search quality counts.
    amplitude.init(apiKey, { autocapture: false });
  }, [analyticsEnabled, apiKey]);

  useEffect(() => {
    if (!analyticsEnabled || !apiKey || !pathname) return;
    amplitude.track("page_viewed", { page_path: pathname });
  }, [analyticsEnabled, apiKey, pathname]);

  return null;
}
