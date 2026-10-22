import assert from "node:assert/strict";
import { test } from "node:test";
import { extractFeedExcerpt } from "../src/lib/ingestion/parse-feed";
import { extractMainText } from "../src/lib/ingestion/article-content";
import { ARTICLE_SUMMARY_MIN_INPUT_CHARS } from "../src/lib/ingestion/article-summary";

test("extractFeedExcerpt extracts from contentSnippet when available", () => {
  const text = "A".repeat(120);
  const result = extractFeedExcerpt({ contentSnippet: text });
  assert.equal(result, text);
});

test("extractFeedExcerpt extracts from content:encodedSnippet when contentSnippet is missing (Medium style)", () => {
  const text = "당근 커뮤니티홈팀에서 백엔드를 개발하는 제이예요. ".repeat(10);
  const result = extractFeedExcerpt({
    title: "모델만 바꿨는데 LLM 비용이 3배가 된 이유",
    "content:encodedSnippet": text,
  });
  assert.ok(result);
  assert.equal(result, text.trim());
});

test("extractFeedExcerpt cleans HTML from content:encoded when snippets are missing", () => {
  const paragraph = "카카오 자체 비전 인코더 모델을 소개합니다. ".repeat(10);
  const html = `<div class="post"><p>${paragraph}</p><script>console.log("bad");</script></div>`;
  const result = extractFeedExcerpt({
    "content:encoded": html,
  });
  assert.ok(result);
  assert.ok(result.includes("카카오 자체 비전 인코더 모델을 소개합니다."));
  assert.ok(!result.includes("console.log"));
});

test("extractFeedExcerpt cleans HTML from content or description", () => {
  const paragraph = "NHN Cloud 밋업 포스트 내용입니다. ".repeat(10);
  const html = `<article><p>${paragraph}</p></article>`;
  const result = extractFeedExcerpt({
    content: html,
  });
  assert.ok(result);
  assert.ok(result.includes("NHN Cloud 밋업 포스트 내용입니다."));
});

test("extractMainText extracts from standard article tags", () => {
  const bodyText = "엔지니어링 아키텍처 개선 과정에 대한 글입니다. ".repeat(20);
  const html = `<html><body><nav>Menu</nav><article><p>${bodyText}</p></article></body></html>`;
  const result = extractMainText(html);
  assert.equal(result.supported, true);
  assert.equal(result.blocked, false);
  assert.ok(result.text.length >= 250);
});

test("extractMainText extracts from Nuxt 3 __NUXT_DATA__ when article tag is minimal or stub (e.g. Kakao Tech)", () => {
  const richArticle = "<p>" + "카카오 카나나 비전 인코더의 학습과 추론 최적화 기법에 대해 설명합니다. ".repeat(25) + "</p>";
  const nuxtPayload = JSON.stringify([
    "ShallowReactive",
    { title: "Kanana" },
    richArticle,
  ]);
  const html = `
    <html>
      <body>
        <article><h1 class="tit">Kanana 개발기</h1></article>
        <script id="__NUXT_DATA__" type="application/json">${nuxtPayload}</script>
      </body>
    </html>
  `;
  const result = extractMainText(html);
  assert.equal(result.supported, true);
  assert.equal(result.blocked, false);
  assert.ok(result.text.includes("카카오 카나나 비전 인코더의 학습과 추론"));
  assert.ok(result.text.length >= 500);
});

test("extractMainText extracts from Schema.org JSON-LD articleBody", () => {
  const articleBody = "JSON-LD 본문 추출 테스트 데이터입니다. ".repeat(20);
  const ldJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "테스트 포스트",
    articleBody,
  });
  const html = `
    <html>
      <head>
        <script type="application/ld+json">${ldJson}</script>
      </head>
      <body>
        <div>짧은 페이지</div>
      </body>
    </html>
  `;
  const result = extractMainText(html);
  assert.equal(result.supported, true);
  assert.equal(result.blocked, false);
  assert.ok(result.text.includes("JSON-LD 본문 추출 테스트 데이터입니다."));
});

test("extractMainText supports short technical posts (between 250 and 800 chars)", () => {
  const shortText = "Figma의 새로운 코드 연동 기능이 업데이트되었습니다. 레이어와 스펙을 캔버스로 가져올 수 있습니다. ".repeat(6);
  assert.ok(shortText.length >= 250 && shortText.length < 800);
  const html = `<html><body><article><p>${shortText}</p></article></body></html>`;
  const result = extractMainText(html);
  assert.equal(result.supported, true);
  assert.equal(result.blocked, false);
  assert.equal(result.text, shortText.trim());
});

test("extractMainText detects paywall and blocked walls", () => {
  const html = `<html><body><div class="login-wall">로그인이 필요합니다</div></body></html>`;
  const result = extractMainText(html);
  assert.equal(result.blocked, true);
  assert.equal(result.text, "");
});

test("ARTICLE_SUMMARY_MIN_INPUT_CHARS is lowered to 200 for concise articles and excerpts", () => {
  assert.equal(ARTICLE_SUMMARY_MIN_INPUT_CHARS, 200);
});
