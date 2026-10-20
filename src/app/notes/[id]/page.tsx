import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { DeleteZettelNoteForm, DeleteZettelNoteLinkForm, ConnectZettelNotesForm } from "@/components/zettelkasten/note-forms";
import { HeaderAuthSlot } from "@/components/header-auth-slot";
import { PageHeader } from "@/components/page-header";
import { getMyZettelNote, listMyZettelNoteOptions } from "@/lib/data/zettelkasten";
import { NOTE_ARTICLE_RELATION_LABELS, NOTE_LINK_RELATION_LABELS } from "@/lib/zettelkasten/validation";
import { getCurrentUser } from "@/lib/supabase/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotePageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ZettelNotePage({ params }: NotePageProps) {
  await connection();
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/notes/${id}`)}`);

  const [view, noteOptions] = await Promise.all([getMyZettelNote(id), listMyZettelNoteOptions(id)]);
  if (!view) notFound();

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <PageHeader navHref="/notes" navLabel="내 지식망" authSlot={<HeaderAuthSlot />} />
      <nav aria-label="breadcrumb">
        <ol style={{ display: "flex", gap: 8, listStyle: "none", flexWrap: "wrap", color: "var(--seed-color-fg-neutral-muted)" }}>
          <li><Link href="/notes">내 지식망</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">노트</li>
        </ol>
      </nav>

      <article style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">{view.note.title}</Text>
        <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
          수정 {new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(view.note.updated_at))}
        </Text>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "var(--seed-color-fg-neutral)" }}>{view.note.body}</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/notes/${id}/edit`} style={{ color: "var(--seed-color-fg-brand)" }}>노트 수정</Link>
          <DeleteZettelNoteForm noteId={id} />
        </div>
      </article>

      <section aria-labelledby="note-sources" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Text as="h2" id="note-sources" textStyle="t6Bold" color="fg.neutral">출처 기사</Text>
        {view.sources.length > 0 ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none" }}>
            {view.sources.map((source) => (
              <li key={source.article.id} style={{ borderLeft: "3px solid var(--seed-color-stroke-brand-weak)", paddingLeft: 12 }}>
                <Link href={`/articles/${source.article.id}/connections`} style={{ color: "var(--seed-color-fg-brand)" }}>
                  {source.article.title}
                </Link>
                <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
                  {NOTE_ARTICLE_RELATION_LABELS[source.relation]} · {source.article.source.title ?? source.article.source.site_url}
                </Text>
              </li>
            ))}
          </ul>
        ) : (
          <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">연결된 기사가 없습니다.</Text>
        )}
      </section>

      <section aria-labelledby="outgoing-links" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Text as="h2" id="outgoing-links" textStyle="t6Bold" color="fg.neutral">이 노트가 연결하는 생각</Text>
        {view.outgoing.length > 0 ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none" }}>
            {view.outgoing.map((link) => (
              <li key={link.note.id} style={{ border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 10, padding: 12 }}>
                <Link href={`/notes/${link.note.id}`} style={{ color: "var(--seed-color-fg-brand)" }}>{link.note.title}</Link>
                <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
                  이 노트가 연결 노트를 {NOTE_LINK_RELATION_LABELS[link.relation]}
                </Text>
                {link.rationale && (
                  <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral)" style={{ marginTop: 6 }}>{link.rationale}</Text>
                )}
                <DeleteZettelNoteLinkForm fromNoteId={id} toNoteId={link.note.id} />
              </li>
            ))}
          </ul>
        ) : (
          <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">아직 다른 노트로 이어지는 연결이 없습니다.</Text>
        )}
      </section>

      <section aria-labelledby="incoming-links" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Text as="h2" id="incoming-links" textStyle="t6Bold" color="fg.neutral">이 노트로 이어지는 생각</Text>
        {view.incoming.length > 0 ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none" }}>
            {view.incoming.map((link) => (
              <li key={link.note.id} style={{ border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 10, padding: 12 }}>
                <Link href={`/notes/${link.note.id}`} style={{ color: "var(--seed-color-fg-brand)" }}>{link.note.title}</Link>
                <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
                  연결 노트가 이 노트를 {NOTE_LINK_RELATION_LABELS[link.relation]}
                </Text>
                {link.rationale && (
                  <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral)" style={{ marginTop: 6 }}>{link.rationale}</Text>
                )}
                <DeleteZettelNoteLinkForm fromNoteId={link.note.id} toNoteId={id} />
              </li>
            ))}
          </ul>
        ) : (
          <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">이 노트로 들어오는 연결이 아직 없습니다.</Text>
        )}
      </section>

      <section aria-labelledby="add-note-link" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Text as="h2" id="add-note-link" textStyle="t6Bold" color="fg.neutral">다른 생각과 연결하기</Text>
        <ConnectZettelNotesForm noteId={id} notes={noteOptions} />
      </section>
    </main>
  );
}
