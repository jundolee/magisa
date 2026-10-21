"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  attachArticleToMyZettelNote,
  connectMyZettelNotes,
  createMyZettelNoteFromArticle,
  deleteMyZettelNote,
  deleteMyZettelNoteLink,
  updateMyZettelNote,
} from "@/lib/data/zettelkasten";
import { getCurrentUser } from "@/lib/supabase/current-user";
import {
  validateNote,
  validateNoteArticleRelation,
  validateNoteLink,
} from "@/lib/zettelkasten/validation";

export interface ZettelActionState {
  ok: boolean;
  message: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireSignedInUser(nextPath: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

export async function createZettelNoteAction(
  _previous: ZettelActionState,
  formData: FormData
): Promise<ZettelActionState> {
  const articleId = String(formData.get("articleId") ?? "").trim();
  const articlePath = `/articles/${articleId}/connections`;
  const nextPath = uuidPattern.test(articleId) ? articlePath : "/";
  await requireSignedInUser(nextPath);
  if (!uuidPattern.test(articleId)) return { ok: false, message: "원문 글을 찾을 수 없습니다." };

  const note = validateNote(formData.get("title"), formData.get("body"));
  if (!note.ok) return { ok: false, message: note.error };

  let noteId: string;
  try {
    noteId = await createMyZettelNoteFromArticle(articleId, note.value.title, note.value.body);
  } catch {
    return { ok: false, message: "노트를 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요." };
  }
  revalidatePath("/notes");
  revalidatePath(articlePath);
  redirect(`/notes/${noteId}`);
}

export async function updateZettelNoteAction(
  _previous: ZettelActionState,
  formData: FormData
): Promise<ZettelActionState> {
  const noteId = String(formData.get("noteId") ?? "").trim();
  const nextPath = uuidPattern.test(noteId) ? `/notes/${noteId}` : "/notes";
  await requireSignedInUser(nextPath);
  if (!uuidPattern.test(noteId)) return { ok: false, message: "노트를 찾을 수 없습니다." };

  const note = validateNote(formData.get("title"), formData.get("body"));
  if (!note.ok) return { ok: false, message: note.error };

  try {
    await updateMyZettelNote(noteId, note.value.title, note.value.body);
    revalidatePath("/notes");
    revalidatePath(`/notes/${noteId}`);
    return { ok: true, message: "노트를 저장했습니다." };
  } catch {
    return { ok: false, message: "노트를 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요." };
  }
}

export async function deleteZettelNoteAction(formData: FormData): Promise<void> {
  const noteId = String(formData.get("noteId") ?? "").trim();
  await requireSignedInUser("/notes");
  if (!uuidPattern.test(noteId)) return;
  await deleteMyZettelNote(noteId);
  revalidatePath("/notes");
  redirect("/notes");
}

export async function attachArticleToZettelNoteAction(
  _previous: ZettelActionState,
  formData: FormData
): Promise<ZettelActionState> {
  const articleId = String(formData.get("articleId") ?? "").trim();
  const noteId = String(formData.get("noteId") ?? "").trim();
  const articlePath = `/articles/${articleId}/connections`;
  const path = uuidPattern.test(articleId) ? articlePath : "/notes";
  await requireSignedInUser(path);
  if (!uuidPattern.test(articleId) || !uuidPattern.test(noteId)) {
    return { ok: false, message: "기사와 노트를 다시 선택해주세요." };
  }

  const relation = validateNoteArticleRelation(formData.get("relation"));
  if (!relation.ok) return { ok: false, message: relation.error };
  try {
    await attachArticleToMyZettelNote(noteId, articleId, relation.value);
    revalidatePath(articlePath);
    revalidatePath(`/notes/${noteId}`);
    return { ok: true, message: "이 기사를 노트의 출처에 연결했습니다." };
  } catch {
    return { ok: false, message: "기사 출처를 연결하지 못했습니다." };
  }
}

export async function connectZettelNotesAction(
  _previous: ZettelActionState,
  formData: FormData
): Promise<ZettelActionState> {
  const fromNoteId = String(formData.get("fromNoteId") ?? "").trim();
  const path = uuidPattern.test(fromNoteId) ? `/notes/${fromNoteId}` : "/notes";
  await requireSignedInUser(path);
  if (!uuidPattern.test(fromNoteId)) return { ok: false, message: "현재 노트를 찾을 수 없습니다." };

  const link = validateNoteLink(
    formData.get("toNoteId"),
    formData.get("relation"),
    formData.get("rationale")
  );
  if (!link.ok) return { ok: false, message: link.error };
  if (link.value.targetNoteId === fromNoteId) return { ok: false, message: "노트 자기 자신과는 연결할 수 없습니다." };

  try {
    await connectMyZettelNotes(fromNoteId, link.value.targetNoteId, link.value.relation, link.value.rationale);
    revalidatePath(`/notes/${fromNoteId}`);
    revalidatePath(`/notes/${link.value.targetNoteId}`);
    return { ok: true, message: "노트 연결을 저장했습니다." };
  } catch {
    return { ok: false, message: "노트를 연결하지 못했습니다." };
  }
}

export async function deleteZettelNoteLinkAction(
  _previous: ZettelActionState,
  formData: FormData
): Promise<ZettelActionState> {
  const fromNoteId = String(formData.get("fromNoteId") ?? "").trim();
  const toNoteId = String(formData.get("toNoteId") ?? "").trim();
  const path = uuidPattern.test(fromNoteId) ? `/notes/${fromNoteId}` : "/notes";
  await requireSignedInUser(path);
  if (!uuidPattern.test(fromNoteId) || !uuidPattern.test(toNoteId)) {
    return { ok: false, message: "연결을 찾을 수 없습니다." };
  }

  try {
    await deleteMyZettelNoteLink(fromNoteId, toNoteId);
    revalidatePath(`/notes/${fromNoteId}`);
    revalidatePath(`/notes/${toNoteId}`);
    return { ok: true, message: "노트 연결을 삭제했습니다." };
  } catch {
    return { ok: false, message: "노트 연결을 삭제하지 못했습니다." };
  }
}
