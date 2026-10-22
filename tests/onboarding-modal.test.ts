import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("onboarding modal screenshots exist in public/onboarding", () => {
  const step1 = path.join(process.cwd(), "public/onboarding/step1-feed.png");
  const step2 = path.join(process.cwd(), "public/onboarding/step2-ai-summary.png");
  const step3 = path.join(process.cwd(), "public/onboarding/step3-unread-sync.png");

  assert.ok(fs.existsSync(step1), "step1-feed.png must exist");
  assert.ok(fs.existsSync(step2), "step2-ai-summary.png must exist");
  assert.ok(fs.existsSync(step3), "step3-unread-sync.png must exist");

  const stat1 = fs.statSync(step1);
  const stat2 = fs.statSync(step2);
  const stat3 = fs.statSync(step3);

  assert.ok(stat1.size > 10000, "step 1 image should be a non-trivial capture (>10KB)");
  assert.ok(stat2.size > 10000, "step 2 image should be a non-trivial capture (>10KB)");
  assert.ok(stat3.size > 10000, "step 3 image should be a non-trivial capture (>10KB)");
});

test("onboarding component source contains refined clean marketing propositions", () => {
  const componentPath = path.join(process.cwd(), "src/components/onboarding-modal.tsx");
  const content = fs.readFileSync(componentPath, "utf-8");

  // 마케팅 소구점 확인
  assert.ok(content.includes("매일 아침 자동 수집"), "Contains daily auto fetch hook");
  assert.ok(content.includes("AI 3줄 핵심 요약"), "Contains AI summary hook");
  assert.ok(content.includes("안읽은 새 글"), "Contains unread articles filter hook");
  assert.ok(content.includes("Google 1초 시작하기"), "Contains quick google signup CTA");
  assert.ok(content.includes("techgotgan_onboarding_dismissed"), "Uses correct storage key");
  assert.ok(!content.includes("vercel.app"), "Does not show vercel.app in UI");
});
