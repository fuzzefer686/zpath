import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsArticlePageView } from "@/components/news/NewsArticlePageView";
import { getPublishedNewsArticleBySlug } from "@/lib/news-server";
import { getAbsoluteUrl } from "@/lib/seo";

type BlogArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const article = await getPublishedNewsArticleBySlug(slug);

    if (!article) {
      return {
        title: "Không tìm thấy bài viết - ZPATH",
      };
    }

    return {
      title: article.title,
      description: article.excerpt,
      alternates: {
        canonical: `/blog/${article.slug}`,
      },
      openGraph: {
        title: article.title,
        description: article.excerpt,
        url: `/blog/${article.slug}`,
        images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: article.title,
        description: article.excerpt,
        images: article.coverImageUrl ? [getAbsoluteUrl(article.coverImageUrl)] : undefined,
      },
    };
  } catch {
    return {
      title: "Bài viết ZPATH",
    };
  }
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const article = await getPublishedNewsArticleBySlug(slug);
  if (!article) notFound();

  return <NewsArticlePageView article={article} />;
}
