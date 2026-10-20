"use client";

import { useActionState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import {
  attachArticleToZettelNoteAction,
  connectZettelNotesAction,
  createZettelNoteAction,
  deleteZettelNoteAction,
  deleteZettelNoteLinkAction,
  updateZettelNoteAction,
  type ZettelActionState,
} from "@/app/zettelkasten/actions";
import {
  NOTE_ARTICLE_RELATION_LABELS,
  NOTE_ARTICLE_RELATIONS,
  NOTE_BODY_MAX_LENGTH,
  NOTE_LINK_RELATION_LABELS,
  NOTE_LINK_RELATIONS,
  NOTE_LINK_RATIONALE_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  type NoteArticleRelation,
  type NoteLinkRelation,
} from "@/lib/zettelkasten/validation";
import type { ZettelNoteSummary } from "@/lib/data/zettelkasten";

const MUTED = "var(--seed-color-fg-neutral-muted)";
const FIELD_STYLE = {
  width: "100%",
  border: "1px solid var(--seed-color-stroke-neutral-subtle)",
  borderRadius: 8,
  padding: "10px 12px",
  font: "inherit",
  color: "var(--foreground)",
  background: "white",
} as const;

const INITIAL_STATE: ZettelActionState = { ok: false, message: "" };

function Feedback({ state }: { state: ZettelActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} style={{ color: state.ok ? "#197a45" : "#b42318" }}>
      {state.message}
    </p>
  );
}

export function CreateZettelNoteForm({ articleId }: { articleId: string }) {
  const [state, action, pending] = useActionState(createZettelNoteAction, INITIAL_STATE);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="articleId" value={articleId} />
      <label htmlFor="new-zettel-title">노트 제목</label>
      <input
        id="new-zettel-title"
        name="title"
        maxLength={NOTE_TITLE_MAX_LENGTH}
        required
        placeholder="핵심 생각을 한 문장으로 적어보세요"
        style={FIELD_STYLE}
      />
      <label htmlFor="new-zettel-body">내 생각</label>
      <textarea
        id="new-zettel-body"
        name="body"
        maxLength={NOTE_BODY_MAX_LENGTH}
        required
        rows={5}
        placeholder="기사 내용을 옮기기보다, 내 말로 다시 설명하고 기존 생각과 연결해보세요."
        style={{ ...FIELD_STYLE, resize: "vertical" }}
      />
      <Feedback state={state} />
      <div>
        <ActionButton type="submit" variant="brandSolid" size="small" disabled={pending}>
          {pending ? "저장 중…" : "출처와 함께 노트 저장"}
        </ActionButton>
      </div>
    </form>
  );
}

export function UpdateZettelNoteForm({ note }: { note: { id: string; title: string; body: string } }) {
  const [state, action, pending] = useActionState(updateZettelNoteAction, INITIAL_STATE);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="noteId" value={note.id} />
      <label htmlFor="edit-zettel-title">제목</label>
      <input id="edit-zettel-title" name="title" defaultValue={note.title} maxLength={NOTE_TITLE_MAX_LENGTH} required style={FIELD_STYLE} />
      <label htmlFor="edit-zettel-body">내용</label>
      <textarea
        id="edit-zettel-body"
        name="body"
        defaultValue={note.body}
        maxLength={NOTE_BODY_MAX_LENGTH}
        rows={14}
        required
        style={{ ...FIELD_STYLE, resize: "vertical" }}
      />
      <Feedback state={state} />
      <div>
        <ActionButton type="submit" variant="brandSolid" size="small" disabled={pending}>
          {pending ? "저장 중…" : "변경사항 저장"}
        </ActionButton>
      </div>
    </form>
  );
}

export function AttachArticleToNoteForm({
  articleId,
  notes,
}: {
  articleId: string;
  notes: Pick<ZettelNoteSummary, "id" | "title">[];
}) {
  const [state, action, pending] = useActionState(attachArticleToZettelNoteAction, INITIAL_STATE);
  if (notes.length === 0) return null;
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="articleId" value={articleId} />
      <label htmlFor="attach-article-note">기존 노트와 연결</label>
      <select id="attach-article-note" name="noteId" required style={FIELD_STYLE} defaultValue="">
        <option value="" disabled>노트 선택</option>
        {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
      </select>
      <label htmlFor="article-note-relation">이 기사는 노트와 어떤 관계인가요?</label>
      <select id="article-note-relation" name="relation" required style={FIELD_STYLE} defaultValue="inspiration">
        {NOTE_ARTICLE_RELATIONS.map((relation) => (
          <option key={relation} value={relation}>{NOTE_ARTICLE_RELATION_LABELS[relation]}</option>
        ))}
      </select>
      <Feedback state={state} />
      <div>
        <ActionButton type="submit" variant="neutralWeak" size="small" disabled={pending}>
          {pending ? "연결 중…" : "기사와 노트 연결"}
        </ActionButton>
      </div>
    </form>
  );
}

export function AttachArticleToSuggestedNoteForm({
  articleId,
  noteId,
}: {
  articleId: string;
  noteId: string;
}) {
  const [state, action, pending] = useActionState(attachArticleToZettelNoteAction, INITIAL_STATE);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="noteId" value={noteId} />
      <label htmlFor={`suggested-note-relation-${noteId}`}>새 기사가 이 노트와 맺는 관계</label>
      <select
        id={`suggested-note-relation-${noteId}`}
        name="relation"
        required
        defaultValue="inspiration"
        style={FIELD_STYLE}
      >
        {NOTE_ARTICLE_RELATIONS.map((relation) => (
          <option key={relation} value={relation}>{NOTE_ARTICLE_RELATION_LABELS[relation]}</option>
        ))}
      </select>
      <Feedback state={state} />
      <div>
        <ActionButton type="submit" variant="neutralWeak" size="small" disabled={pending}>
          {pending ? "연결 중…" : "이 노트에 기사 연결"}
        </ActionButton>
      </div>
    </form>
  );
}

export function ConnectZettelNotesForm({
  noteId,
  notes,
}: {
  noteId: string;
  notes: Pick<ZettelNoteSummary, "id" | "title">[];
}) {
  const [state, action, pending] = useActionState(connectZettelNotesAction, INITIAL_STATE);
  if (notes.length === 0) {
    return <p style={{ color: MUTED }}>연결할 다른 노트가 아직 없습니다. 기사에서 새 노트를 만들어보세요.</p>;
  }
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="fromNoteId" value={noteId} />
      <label htmlFor="connect-zettel-note">연결할 노트</label>
      <select id="connect-zettel-note" name="toNoteId" required style={FIELD_STYLE} defaultValue="">
        <option value="" disabled>노트 선택</option>
        {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
      </select>
      <label htmlFor="zettel-note-relation">관계</label>
      <select id="zettel-note-relation" name="relation" required style={FIELD_STYLE} defaultValue="related">
        {NOTE_LINK_RELATIONS.map((relation) => (
          <option key={relation} value={relation}>{NOTE_LINK_RELATION_LABELS[relation]}</option>
        ))}
      </select>
      <label htmlFor="zettel-link-rationale">왜 연결하나요? (선택)</label>
      <textarea
        id="zettel-link-rationale"
        name="rationale"
        maxLength={NOTE_LINK_RATIONALE_MAX_LENGTH}
        rows={2}
        placeholder="두 생각이 만나는 지점을 짧게 적어두세요."
        style={{ ...FIELD_STYLE, resize: "vertical" }}
      />
      <Feedback state={state} />
      <div>
        <ActionButton type="submit" variant="brandSolid" size="small" disabled={pending}>
          {pending ? "연결 중…" : "노트 연결 저장"}
        </ActionButton>
      </div>
    </form>
  );
}

export function DeleteZettelNoteForm({ noteId }: { noteId: string }) {
  return (
    <form
      action={deleteZettelNoteAction}
      onSubmit={(event) => {
        if (!window.confirm("이 노트와 노트 연결을 삭제할까요?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="noteId" value={noteId} />
      <ActionButton type="submit" variant="neutralWeak" size="small">
        노트 삭제
      </ActionButton>
    </form>
  );
}

export function DeleteZettelNoteLinkForm({ fromNoteId, toNoteId }: { fromNoteId: string; toNoteId: string }) {
  const [state, action, pending] = useActionState(deleteZettelNoteLinkAction, INITIAL_STATE);
  return (
    <form action={action}>
      <input type="hidden" name="fromNoteId" value={fromNoteId} />
      <input type="hidden" name="toNoteId" value={toNoteId} />
      <button type="submit" disabled={pending} style={{ border: 0, background: "none", color: MUTED, cursor: "pointer" }}>
        {pending ? "삭제 중…" : "연결 해제"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export type { NoteArticleRelation, NoteLinkRelation };
