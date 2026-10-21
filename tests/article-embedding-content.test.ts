import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildArticleEmbeddingText,
  hashArticleEmbeddingContent,
} from "../src/lib/ingestion/article-embedding-content";

test("article embedding text combines available metadata without blank sections", () => {
  assert.equal(
    buildArticleEmbeddingText({
      title: "  Postgres 인덱스  ",
      excerpt: " 쿼리 계획을 비교합니다. ",
      category: "backend",
      tags: ["postgresql", "index"],
    }),
    "제목: Postgres 인덱스\n요약: 쿼리 계획을 비교합니다.\n주제: backend\n태그: postgresql, index"
  );
  assert.equal(
    buildArticleEmbeddingText({ title: "AI agents", excerpt: null, category: "ai_ml", tags: [] }),
    "제목: AI agents\n주제: ai_ml"
  );
});

test("article content hash is stable and changes when an indexed field changes", () => {
  const article = { title: "캐시", excerpt: null, category: "backend", tags: ["redis"] };
  assert.equal(hashArticleEmbeddingContent(article), hashArticleEmbeddingContent({ ...article }));
  assert.notEqual(hashArticleEmbeddingContent(article), hashArticleEmbeddingContent({ ...article, tags: ["redis", "cache"] }));
  assert.notEqual(hashArticleEmbeddingContent(article), hashArticleEmbeddingContent({ ...article, excerpt: "읽기 지연" }));
});
