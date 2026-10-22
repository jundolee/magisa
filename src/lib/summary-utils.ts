/**
 * 요약 문장의 앞머리에 포함된 불필요한 섹션 라벨(예: "문제 & 배경: ", "기술 & 해결책: ")을 제거합니다.
 */
export function cleanKeyPoint(text: string): string {
  return text
    .replace(/^([\p{Extended_Pictographic}\p{Emoji}\d.*•\-])*\s*(문제\s*(&|및)?\s*배경|기술\s*(&|및)?\s*해결책|교훈\s*(&|및)?\s*주의점|핵심\s*\d*)\s*[:：\-]\s*/iu, "")
    .trim();
}
