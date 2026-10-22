import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanKeyPoint } from "../src/lib/summary-utils";

test("cleanKeyPoint removes redundant section labels from key points", () => {
  assert.equal(
    cleanKeyPoint("문제 & 배경: Gemini를 단가가 20% 낮은 GPT-5.6으로 교체했지만"),
    "Gemini를 단가가 20% 낮은 GPT-5.6으로 교체했지만"
  );
  assert.equal(
    cleanKeyPoint("기술 & 해결책: 반복되는 지시문과 카테고리 목록 같은 프롬프트"),
    "반복되는 지시문과 카테고리 목록 같은 프롬프트"
  );
  assert.equal(
    cleanKeyPoint("💡 교훈 & 주의점: 소리가 너무 복잡하거나 높으면"),
    "소리가 너무 복잡하거나 높으면"
  );
  assert.equal(
    cleanKeyPoint("🚨 문제 & 배경: 애플 뮤직은 음악을 시각적으로 보여줄"),
    "애플 뮤직은 음악을 시각적으로 보여줄"
  );
  assert.equal(
    cleanKeyPoint("1. 문제 및 배경 : 비용 증가 원인"),
    "비용 증가 원인"
  );
  assert.equal(
    cleanKeyPoint("핵심 1: 단가 최적화"),
    "단가 최적화"
  );
  assert.equal(
    cleanKeyPoint("정상적인 문장은 그대로 유지됩니다."),
    "정상적인 문장은 그대로 유지됩니다."
  );
  assert.equal(
    cleanKeyPoint("문제 & 배경: 대규모 트래픽 발생 시 응답 지연이 심화되었습니다."),
    "대규모 트래픽 발생 시 응답 지연이 심화되었습니다."
  );
  assert.equal(
    cleanKeyPoint("🛠️ 기술 & 해결책: 비동기 큐와 분산 캐시를 도입하여 부하를 분산했습니다."),
    "비동기 큐와 분산 캐시를 도입하여 부하를 분산했습니다."
  );
  assert.equal(
    cleanKeyPoint("💡 교훈 & 주의점: 캐시 만료 시점(TTL)을 세밀하게 조정해야 캐시 스탬피드를 방지할 수 있습니다."),
    "캐시 만료 시점(TTL)을 세밀하게 조정해야 캐시 스탬피드를 방지할 수 있습니다."
  );
});
