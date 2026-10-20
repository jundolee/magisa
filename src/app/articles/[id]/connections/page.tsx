import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { ArticleLink } from "@/components/article-link";
import {
  AttachArticleToNoteForm,
  AttachArticleToSuggestedNoteForm,
  CreateZettelNoteForm,
} from "@/components/zettelkasten/note-forms";
import { HeaderAuthSlot } from "@/components/header-auth-slot";
import { PageHeader } from "@/components/page-header";
import { getArticleDetails, getRelatedArticles, type RelatedArticlesStatus } from "@/lib/data/article-connections";
import {
  listMyNotesForArticle,
  listMyZettelNoteOptions,
  suggestMyNotesForRelatedArticles,
} from "@/lib/data/zettelkasten";
import { getCurrentUser } from "@/lib/supabase/current-user";

export const runtime = "nodejs";
export const fetchCache = "default-cache";

type ArticlePageProps = { params: Promise<{ id: string }> };

function formatDate(value: string | null): string | null {
  return value
    ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value))
    : null;
}

function loginHref(articleId: string): string {
  return `/login?next=${encodeURIComponent(`/articles/${articleId}/connections`)}`;
}

function RelatedArticleState({ status }: { status: Exclude<RelatedArticlesStatus, "ready"> }) {
  const messages: Record<Exclude<RelatedArticlesStatus, "ready">, string> = {
    unconfigured: "관련 글 연결을 준비하고 있어요.",
    pending: "이 기사의 연결 후보를 만들고 있어요. 잠시 뒤 다시 확인해주세요.",
    failed: "연결 후보를 만드는 중 문제가 생겨 자동 재시도를 기다리고 있어요.",
    unavailable: "지금은 연결 후보를 불러올 수 없어요. 잠시 뒤 다시 시도해주세요.",
  };
  return <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">{messages[status]}</Text>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const article = await getArticleDetails(id);
  return {
    title: article?.title ?? "기사 연결",
    robots: { index: false, follow: false },
  };
}

export default async function ArticleKnowledgePage({ params }: ArticlePageProps) {
  await connection();
  const { id } = await params;
  const article = await getArticleDetails(id);
  if (!article) notFound();

  const user = await getCurrentUser();
  const [related, noteOptions, articleNotes] = await Promise.all([
    getRelatedArticles(article.id),
    user ? listMyZettelNoteOptions() : Promise.resolve([]),
    user ? listMyNotesForArticle(article.id) : Promise.resolve([]),
  ]);
  const articleNoteIds = new Set(articleNotes.map((note) => note.id));
  const noteSuggestions = user && related.status === "ready"
    ? (await suggestMyNotesForRelatedArticles(related.articles)).filter((suggestion) => !articleNoteIds.has(suggestion.note.id))
    : [];

  const published = formatDate(article.published_at);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <PageHeader navHref="/" navLabel="전체 글" authSlot={<HeaderAuthSlot />} />

      <nav aria-label="breadcrumb">
        <ol style={{ display: "flex", gap: 8, listStyle: "none", flexWrap: "wrap", color: "var(--seed-color-fg-neutral-muted)" }}>
          <li><Link href="/">테크곳간</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">기사 연결</li>
        </ol>
      </nav>

      <header style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          {article.source.title ?? article.source.site_url}{published ? ` · ${published}` : ""}
        </Text>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">{article.title}</Text>
        {article.excerpt && (
          <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">{article.excerpt}</Text>
        )}
        <ArticleLink articleId={article.id} articleTitle={article.title} href={article.url}>
          <Text as="span" textStyle="t3Medium" color="var(--seed-color-fg-brand)">원문에서 읽기 ↗</Text>
        </ArticleLink>
      </header>

      <section aria-labelledby="related-articles" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Text as="h2" id="related-articles" textStyle="t6Bold" color="fg.neutral">의미가 가까운 기사</Text>
          <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
            임베딩이 찾은 연결 후보예요. 내용이 실제로 이어지는지 확인한 뒤 내 노트에 연결해보세요.
          </Text>
        </div>
        {related.status === "ready" && related.articles.length > 0 ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none" }}>
            {related.articles.map((item) => (
              <li key={item.id} style={{ borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)", paddingBottom: 12 }}>
                <Link href={`/articles/${encodeURIComponent(item.id)}/connections`} style={{ color: "inherit", textDecoration: "none" }}>
                  <Text as="h3" textStyle="t4Bold" color="fg.neutral">{item.title}</Text>
                  {item.excerpt && (
                    <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
                      {item.excerpt}
                    </Text>
                  )}
                </Link>
                <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
                  {item.source.title ?? item.source.site_url}
                </Text>
              </li>
            ))}
          </ul>
        ) : (
          related.status === "ready"
            ? <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">아직 가까운 기사 후보가 없습니다.</Text>
            : <RelatedArticleState status={related.status} />
        )}
      </section>

      <section aria-labelledby="zettel-notes" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Text as="h2" id="zettel-notes" textStyle="t6Bold" color="fg.neutral">내 생각과 연결하기</Text>
          <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
            기사 요약을 옮기기보다, 이 글이 내 생각을 어떻게 바꾸거나 보강하는지 적어보세요.
          </Text>
        </div>

        {user ? (
          <>
            {noteSuggestions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Text as="h3" textStyle="t4Bold" color="fg.neutral">비슷한 기사에서 이어지는 내 노트</Text>
                <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
                  아래 노트는 이 기사와 비슷한 기사에 이미 연결돼 있어요. 확인한 뒤 현재 기사도 함께 연결할 수 있습니다.
                </Text>
                <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none" }}>
                  {noteSuggestions.map((suggestion) => (
                    <li key={suggestion.note.id} style={{ border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 10, padding: 12 }}>
                      <Link href={`/notes/${suggestion.note.id}`} style={{ color: "var(--seed-color-fg-brand)" }}>
                        {suggestion.note.title}
                      </Link>
                      <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 4 }}>
                        연결된 비슷한 기사: {suggestion.relatedArticle.title}
                      </Text>
                      <AttachArticleToSuggestedNoteForm articleId={article.id} noteId={suggestion.note.id} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {articleNotes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Text as="h3" textStyle="t4Bold" color="fg.neutral">이미 연결한 내 노트</Text>
                <ul style={{ display: "flex", flexDirection: "column", gap: 6, listStyle: "none" }}>
                  {articleNotes.map((note) => (
                    <li key={note.id}><Link href={`/notes/${note.id}`} style={{ color: "var(--seed-color-fg-brand)" }}>{note.title}</Link></li>
                  ))}
                </ul>
              </div>
            )}
            <CreateZettelNoteForm articleId={article.id} />
            {noteOptions.length > 0 && <AttachArticleToNoteForm articleId={article.id} notes={noteOptions} />}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
              로그인하면 이 기사를 내 노트에 인용하고 다른 생각과 연결할 수 있어요.
            </Text>
            <Link href={loginHref(article.id)} style={{ color: "var(--seed-color-fg-brand)" }}>로그인하고 노트 만들기 →</Link>
          </div>
        )}
      </section>
    </main>
  );
}
