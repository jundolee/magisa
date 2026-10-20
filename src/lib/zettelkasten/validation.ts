export const NOTE_TITLE_MAX_LENGTH = 180;
export const NOTE_BODY_MAX_LENGTH = 20_000;
export const NOTE_LINK_RATIONALE_MAX_LENGTH = 600;

export const NOTE_LINK_RELATIONS = [
  "extends",
  "supports",
  "contradicts",
  "example_of",
  "depends_on",
  "related",
] as const;

export type NoteLinkRelation = (typeof NOTE_LINK_RELATIONS)[number];

export const NOTE_LINK_RELATION_LABELS: Record<NoteLinkRelation, string> = {
  extends: "확장한다",
  supports: "뒷받침한다",
  contradicts: "반박한다",
  example_of: "사례로 보여준다",
  depends_on: "전제로 삼는다",
  related: "관련 있다",
};

export const NOTE_ARTICLE_RELATIONS = [
  "inspiration",
  "evidence",
  "counterexample",
  "example",
  "background",
] as const;

export type NoteArticleRelation = (typeof NOTE_ARTICLE_RELATIONS)[number];

export const NOTE_ARTICLE_RELATION_LABELS: Record<NoteArticleRelation, string> = {
  inspiration: "생각을 시작하게 했다",
  evidence: "근거가 된다",
  counterexample: "반례를 보여준다",
  example: "실제 사례다",
  background: "배경을 설명한다",
};

export type ValidatedNote = { title: string; body: string };
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function validateNote(titleValue: unknown, bodyValue: unknown): ValidationResult<ValidatedNote> {
  const title = String(titleValue ?? "").trim();
  const body = String(bodyValue ?? "").trim();

  if (!title) return { ok: false, error: "노트 제목을 입력해주세요." };
  if (codePointLength(title) > NOTE_TITLE_MAX_LENGTH) {
    return { ok: false, error: `제목은 ${NOTE_TITLE_MAX_LENGTH}자 이내로 입력해주세요.` };
  }
  if (!body) return { ok: false, error: "노트 내용을 입력해주세요." };
  if (codePointLength(body) > NOTE_BODY_MAX_LENGTH) {
    return { ok: false, error: `내용은 ${NOTE_BODY_MAX_LENGTH.toLocaleString("ko-KR")}자 이내로 입력해주세요.` };
  }

  return { ok: true, value: { title, body } };
}

export function validateNoteLink(
  targetNoteIdValue: unknown,
  relationValue: unknown,
  rationaleValue: unknown
): ValidationResult<{ targetNoteId: string; relation: NoteLinkRelation; rationale: string }> {
  const targetNoteId = String(targetNoteIdValue ?? "").trim();
  const relation = String(relationValue ?? "") as NoteLinkRelation;
  const rationale = String(rationaleValue ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetNoteId)) {
    return { ok: false, error: "연결할 노트를 선택해주세요." };
  }
  if (!NOTE_LINK_RELATIONS.includes(relation)) {
    return { ok: false, error: "연결 관계를 선택해주세요." };
  }
  if (codePointLength(rationale) > NOTE_LINK_RATIONALE_MAX_LENGTH) {
    return { ok: false, error: `연결 이유는 ${NOTE_LINK_RATIONALE_MAX_LENGTH}자 이내로 입력해주세요.` };
  }

  return { ok: true, value: { targetNoteId, relation, rationale } };
}

export function validateNoteArticleRelation(value: unknown): ValidationResult<NoteArticleRelation> {
  const relation = String(value ?? "") as NoteArticleRelation;
  if (!NOTE_ARTICLE_RELATIONS.includes(relation)) {
    return { ok: false, error: "기사와 노트의 관계를 선택해주세요." };
  }
  return { ok: true, value: relation };
}
