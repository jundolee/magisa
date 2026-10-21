import "server-only";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createServiceClient } from "@/lib/supabase/service";
import type { ArticleDetails } from "@/lib/data/article-connections";
import type { NoteArticleRelation, NoteLinkRelation } from "@/lib/zettelkasten/validation";

export interface ZettelNoteSummary {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
}

export interface ZettelNote extends ZettelNoteSummary {
  body: string;
}

export interface ZettelSource {
  article: Pick<ArticleDetails, "id" | "title" | "url" | "excerpt" | "published_at" | "source">;
  relation: NoteArticleRelation;
  created_at: string;
}

export interface ZettelNoteConnection {
  note: Pick<ZettelNoteSummary, "id" | "title">;
  relation: NoteLinkRelation;
  rationale: string;
  created_at: string;
}

export interface ZettelNoteSuggestion {
  note: Pick<ZettelNoteSummary, "id" | "title">;
  relatedArticle: { id: string; title: string };
  similarityScore: number;
}

export interface ZettelNoteView {
  note: ZettelNote;
  sources: ZettelSource[];
  outgoing: ZettelNoteConnection[];
  incoming: ZettelNoteConnection[];
}

async function requireCurrentUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

async function getArticlesByIds(articleIds: string[]): Promise<Map<string, ArticleDetails>> {
  if (articleIds.length === 0) return new Map();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id,title,url,excerpt,published_at,category,tags,source:sources(id,title,site_url,favicon_url,is_active)"
    )
    .in("id", articleIds);
  if (error) throw error;

  const result = new Map<string, ArticleDetails>();
  type SourceRow = ArticleDetails["source"] & { is_active: boolean };
  type ArticleRow = Omit<ArticleDetails, "source"> & { source: SourceRow | SourceRow[] | null };
  for (const raw of (data ?? []) as unknown as ArticleRow[]) {
    const rawSource = Array.isArray(raw.source) ? raw.source[0] : raw.source;
    if (!rawSource) continue;
    const source = {
      id: rawSource.id,
      title: rawSource.title,
      site_url: rawSource.site_url,
      favicon_url: rawSource.favicon_url,
    };
    result.set(raw.id, { ...raw, source });
  }
  return result;
}

export async function listMyZettelNotes(): Promise<ZettelNoteSummary[]> {
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("zettel_notes")
    .select("id,title,updated_at,created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ZettelNoteSummary[];
}

export async function listMyZettelNoteOptions(excludeNoteId?: string): Promise<Pick<ZettelNoteSummary, "id" | "title">[]> {
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  let query = supabase.from("zettel_notes").select("id,title").eq("user_id", userId).order("title");
  if (excludeNoteId) query = query.neq("id", excludeNoteId);
  const { data, error } = await query.limit(200);
  if (error) throw error;
  return (data ?? []) as Pick<ZettelNoteSummary, "id" | "title">[];
}

export async function listMyNotesForArticle(articleId: string): Promise<ZettelNoteSummary[]> {
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  const { data: links, error: linksError } = await supabase
    .from("zettel_note_articles")
    .select("note_id")
    .eq("user_id", userId)
    .eq("article_id", articleId);
  if (linksError) throw linksError;
  if (!links?.length) return [];

  const { data, error } = await supabase
    .from("zettel_notes")
    .select("id,title,updated_at,created_at")
    .eq("user_id", userId)
    .in("id", links.map((link) => link.note_id))
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ZettelNoteSummary[];
}

/** Suggest the user's notes attached to semantically similar articles without embedding private note text. */
export async function suggestMyNotesForRelatedArticles(
  articles: { id: string; title: string; similarityScore: number }[]
): Promise<ZettelNoteSuggestion[]> {
  if (articles.length === 0) return [];
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  const { data: sourceLinks, error: sourceLinksError } = await supabase
    .from("zettel_note_articles")
    .select("note_id,article_id")
    .eq("user_id", userId)
    .in("article_id", articles.map((article) => article.id));
  if (sourceLinksError) throw sourceLinksError;
  if (!sourceLinks?.length) return [];

  const noteIds = [...new Set(sourceLinks.map((link) => link.note_id))];
  const { data: notes, error: notesError } = await supabase
    .from("zettel_notes")
    .select("id,title")
    .eq("user_id", userId)
    .in("id", noteIds);
  if (notesError) throw notesError;

  const noteById = new Map((notes ?? []).map((note) => [note.id, note]));
  const articleById = new Map(articles.map((article) => [article.id, article]));
  const bestByNoteId = new Map<string, ZettelNoteSuggestion>();
  for (const link of sourceLinks) {
    const note = noteById.get(link.note_id);
    const relatedArticle = articleById.get(link.article_id);
    if (!note || !relatedArticle) continue;
    const existing = bestByNoteId.get(note.id);
    if (!existing || relatedArticle.similarityScore > existing.similarityScore) {
      bestByNoteId.set(note.id, {
        note,
        relatedArticle: { id: relatedArticle.id, title: relatedArticle.title },
        similarityScore: relatedArticle.similarityScore,
      });
    }
  }

  return [...bestByNoteId.values()]
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5);
}

export async function getMyZettelNote(noteId: string): Promise<ZettelNoteView | null> {
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  const { data: rawNote, error: noteError } = await supabase
    .from("zettel_notes")
    .select("id,title,body,updated_at,created_at")
    .eq("user_id", userId)
    .eq("id", noteId)
    .maybeSingle();
  if (noteError) throw noteError;
  if (!rawNote) return null;

  const [sourceResult, outgoingResult, incomingResult] = await Promise.all([
    supabase
      .from("zettel_note_articles")
      .select("article_id,relation,created_at")
      .eq("user_id", userId)
      .eq("note_id", noteId)
      .order("created_at", { ascending: true }),
    supabase
      .from("zettel_note_links")
      .select("to_note_id,relation,rationale,created_at")
      .eq("user_id", userId)
      .eq("from_note_id", noteId)
      .order("created_at", { ascending: false }),
    supabase
      .from("zettel_note_links")
      .select("from_note_id,relation,rationale,created_at")
      .eq("user_id", userId)
      .eq("to_note_id", noteId)
      .order("created_at", { ascending: false }),
  ]);
  if (sourceResult.error) throw sourceResult.error;
  if (outgoingResult.error) throw outgoingResult.error;
  if (incomingResult.error) throw incomingResult.error;

  const sourceRows = sourceResult.data ?? [];
  const outgoingRows = outgoingResult.data ?? [];
  const incomingRows = incomingResult.data ?? [];
  const articleById = await getArticlesByIds(sourceRows.map((row) => row.article_id));
  const otherNoteIds = [...new Set([
    ...outgoingRows.map((row) => row.to_note_id),
    ...incomingRows.map((row) => row.from_note_id),
  ])];
  const { data: otherNotes, error: otherNotesError } = otherNoteIds.length
    ? await supabase.from("zettel_notes").select("id,title").eq("user_id", userId).in("id", otherNoteIds)
    : { data: [], error: null };
  if (otherNotesError) throw otherNotesError;
  const noteById = new Map((otherNotes ?? []).map((note) => [note.id, note]));

  const sources: ZettelSource[] = sourceRows.flatMap((row) => {
    const article = articleById.get(row.article_id);
    return article ? [{ article, relation: row.relation as NoteArticleRelation, created_at: row.created_at }] : [];
  });
  const outgoing: ZettelNoteConnection[] = outgoingRows.flatMap((row) => {
    const note = noteById.get(row.to_note_id);
    return note
      ? [{ note, relation: row.relation as NoteLinkRelation, rationale: row.rationale, created_at: row.created_at }]
      : [];
  });
  const incoming: ZettelNoteConnection[] = incomingRows.flatMap((row) => {
    const note = noteById.get(row.from_note_id);
    return note
      ? [{ note, relation: row.relation as NoteLinkRelation, rationale: row.rationale, created_at: row.created_at }]
      : [];
  });

  return { note: rawNote as ZettelNote, sources, outgoing, incoming };
}

export async function createMyZettelNoteFromArticle(
  articleId: string,
  title: string,
  body: string
): Promise<string> {
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("create_zettel_note_from_article", {
    note_user_id: userId,
    source_article_id: articleId,
    note_title: title,
    note_body: body,
  });
  if (error) throw error;
  if (typeof data !== "string") throw new Error("Could not create note");
  return data;
}

export async function updateMyZettelNote(noteId: string, title: string, body: string): Promise<void> {
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("zettel_notes")
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", noteId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Note not found");
}

export async function deleteMyZettelNote(noteId: string): Promise<void> {
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("zettel_notes")
    .delete()
    .eq("user_id", userId)
    .eq("id", noteId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Note not found");
}

export async function attachArticleToMyZettelNote(
  noteId: string,
  articleId: string,
  relation: NoteArticleRelation
): Promise<void> {
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  const { data: note, error: noteError } = await supabase
    .from("zettel_notes")
    .select("id")
    .eq("user_id", userId)
    .eq("id", noteId)
    .maybeSingle();
  if (noteError) throw noteError;
  if (!note) throw new Error("Note not found");

  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id")
    .eq("id", articleId)
    .maybeSingle();
  if (articleError) throw articleError;
  if (!article) throw new Error("Article not found");

  const { error } = await supabase.from("zettel_note_articles").upsert(
    { user_id: userId, note_id: noteId, article_id: articleId, relation },
    { onConflict: "user_id,note_id,article_id" }
  );
  if (error) throw error;
}

export async function connectMyZettelNotes(
  fromNoteId: string,
  toNoteId: string,
  relation: NoteLinkRelation,
  rationale: string
): Promise<void> {
  const userId = await requireCurrentUserId();
  if (fromNoteId === toNoteId) throw new Error("A note cannot link to itself");

  const supabase = createServiceClient();
  const { data: notes, error: notesError } = await supabase
    .from("zettel_notes")
    .select("id")
    .eq("user_id", userId)
    .in("id", [fromNoteId, toNoteId]);
  if (notesError) throw notesError;
  if (notes?.length !== 2) throw new Error("One of the notes is not available");

  const { error } = await supabase.from("zettel_note_links").upsert(
    { user_id: userId, from_note_id: fromNoteId, to_note_id: toNoteId, relation, rationale },
    { onConflict: "user_id,from_note_id,to_note_id" }
  );
  if (error) throw error;
}

export async function deleteMyZettelNoteLink(fromNoteId: string, toNoteId: string): Promise<void> {
  const userId = await requireCurrentUserId();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("zettel_note_links")
    .delete()
    .eq("user_id", userId)
    .eq("from_note_id", fromNoteId)
    .eq("to_note_id", toNoteId)
    .select("from_note_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Link not found");
}
