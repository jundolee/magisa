import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { UpdateZettelNoteForm } from "@/components/zettelkasten/note-forms";
import { HeaderAuthSlot } from "@/components/header-auth-slot";
import { PageHeader } from "@/components/page-header";
import { getMyZettelNote } from "@/lib/data/zettelkasten";
import { getCurrentUser } from "@/lib/supabase/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function EditZettelNotePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/notes/${id}/edit`)}`);

  const view = await getMyZettelNote(id);
  if (!view) notFound();

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader navHref={`/notes/${id}`} navLabel="노트로 돌아가기" authSlot={<HeaderAuthSlot />} />
      <Text as="h1" textStyle="t8Bold" color="fg.neutral">노트 수정</Text>
      <UpdateZettelNoteForm note={view.note} />
      <Link href={`/notes/${id}`} style={{ color: "var(--seed-color-fg-brand)" }}>취소</Link>
    </main>
  );
}
