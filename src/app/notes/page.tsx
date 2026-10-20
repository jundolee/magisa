import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { HeaderAuthSlot } from "@/components/header-auth-slot";
import { PageHeader } from "@/components/page-header";
import { listMyZettelNotes } from "@/lib/data/zettelkasten";
import { getCurrentUser } from "@/lib/supabase/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ZettelNotesPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/notes")}`);

  const notes = await listMyZettelNotes();

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <PageHeader navHref="/" navLabel="전체 글" authSlot={<HeaderAuthSlot />} />
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">내 지식망</Text>
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          기사에서 시작한 생각과 노트 사이의 관계를 모아둡니다. 새 글을 읽을 때 기존 노트를 보강하거나 반박하는 연결을 추가해보세요.
        </Text>
      </header>

      {notes.length > 0 ? (
        <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none" }}>
          {notes.map((note) => (
            <li key={note.id} style={{ border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 12, padding: 16 }}>
              <Link href={`/notes/${note.id}`}>
                <Text as="h2" textStyle="t5Bold" color="fg.neutral">{note.title}</Text>
                <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 6 }}>
                  마지막 수정 {new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(note.updated_at))}
                </Text>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section style={{ border: "1px dashed var(--seed-color-stroke-neutral-subtle)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <Text as="h2" textStyle="t5Bold" color="fg.neutral">아직 저장한 노트가 없어요</Text>
          <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
            기사 연결 화면에서 핵심 생각을 적으면 출처가 함께 저장됩니다.
          </Text>
          <Link href="/" style={{ color: "var(--seed-color-fg-brand)" }}>기사 둘러보기 →</Link>
        </section>
      )}
    </main>
  );
}
