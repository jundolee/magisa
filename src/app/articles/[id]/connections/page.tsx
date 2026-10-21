import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function ArticleConnectionsRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/articles/${encodeURIComponent(id)}`);
}
