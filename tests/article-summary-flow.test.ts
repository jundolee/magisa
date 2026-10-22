import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeArticlesDirect } from "../src/lib/ingestion/run-summary-jobs";
import { isArticleSummaryEnabled } from "../src/lib/ingestion/article-summary";

test("summarizeArticlesDirect returns zero counts when given empty article array", async () => {
  const result = await summarizeArticlesDirect([]);
  assert.deepEqual(result, { ready: 0, unavailable: 0, failed: 0 });
});

test("isArticleSummaryEnabled is false when OPENAI_SUMMARY_ENABLED is unset or not true", () => {
  const prevEnabled = process.env.OPENAI_SUMMARY_ENABLED;
  const prevKey = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_SUMMARY_ENABLED;
    assert.equal(isArticleSummaryEnabled(), false);

    process.env.OPENAI_SUMMARY_ENABLED = "false";
    assert.equal(isArticleSummaryEnabled(), false);

    process.env.OPENAI_SUMMARY_ENABLED = "true";
    delete process.env.OPENAI_API_KEY;
    assert.equal(isArticleSummaryEnabled(), false);
  } finally {
    if (prevEnabled !== undefined) process.env.OPENAI_SUMMARY_ENABLED = prevEnabled;
    else delete process.env.OPENAI_SUMMARY_ENABLED;
    if (prevKey !== undefined) process.env.OPENAI_API_KEY = prevKey;
    else delete process.env.OPENAI_API_KEY;
  }
});
