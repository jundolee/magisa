"use client";

import { useEffect } from "react";
import * as amplitude from "@amplitude/analytics-browser";

/**
 * GA4(GoogleTagManager)와 동일하게 프로덕션에서만 렌더링된다 (app/layout.tsx 참고) —
 * 로컬 개발 접속이 실제 분석 데이터에 섞이지 않도록.
 */
export function AmplitudeAnalytics() {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
    if (!apiKey) return;
    amplitude.init(apiKey, { autocapture: true });
  }, []);

  return null;
}
