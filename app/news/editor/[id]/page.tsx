import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsEditor } from "@/components/news/NewsEditor";
import { getEditableNewsArticleById, NewsValidationError } from "@/lib/news-server";
import { getAuthContext } from "@/lib/zpath-auth";

type EditNewsArticlePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata: Metadata = {
  title: "Sửa bài viết - ZPATH",
};

export default async function EditNewsArticlePage({ params }: EditNewsArticlePageProps) {
  const auth = await getAuthContext();
  if (!auth) notFound();

  const { id } = await params;
  let article;

  try {
    article = await getEditableNewsArticleById(id, auth.user);
  } catch (error) {
    if (error instanceof NewsValidationError) notFound();
    throw error;
  }

  if (!article) notFound();

  return <NewsEditor article={article} />;
}
