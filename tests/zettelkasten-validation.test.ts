import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validateNote,
  validateNoteArticleRelation,
  validateNoteLink,
} from "../src/lib/zettelkasten/validation";

test("note validation trims fields and accepts Korean content", () => {
  assert.deepEqual(validateNote("  캐시 무효화  ", "\n캐시를 무효화하는 시점과 비용을 비교한다.\n"), {
    ok: true,
    value: { title: "캐시 무효화", body: "캐시를 무효화하는 시점과 비용을 비교한다." },
  });
});

test("note validation enforces the database title and body bounds", () => {
  assert.equal(validateNote("", "내용").ok, false);
  assert.equal(validateNote("제목", " ").ok, false);
  assert.equal(validateNote("가".repeat(181), "내용").ok, false);
  assert.equal(validateNote("제목", "가".repeat(20_001)).ok, false);
});

test("note links require a UUID, supported relation, and bounded rationale", () => {
  const targetId = "123e4567-e89b-42d3-a456-426614174000";
  assert.deepEqual(validateNoteLink(targetId, "contradicts", "전제가 달라 결론이 충돌한다."), {
    ok: true,
    value: { targetNoteId: targetId, relation: "contradicts", rationale: "전제가 달라 결론이 충돌한다." },
  });
  assert.equal(validateNoteLink("not-a-uuid", "related", "").ok, false);
  assert.equal(validateNoteLink(targetId, "invented", "").ok, false);
  assert.equal(validateNoteLink(targetId, "related", "가".repeat(601)).ok, false);
});

test("article citations accept only the stored relationship types", () => {
  assert.deepEqual(validateNoteArticleRelation("counterexample"), { ok: true, value: "counterexample" });
  assert.equal(validateNoteArticleRelation("arbitrary").ok, false);
});
