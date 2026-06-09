import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, User } from "lucide-react";

import { MarkdownPreview } from "@/components/news/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { getPublishedNewsArticleByNumber } from "@/lib/news-server";

type NewsArticlePageProps = {
  params: Promise<{
    articleNumber: string;
  }>;
};

function parseArticleNumber(value: string) {
  if (!/^[1-9][0-9]{0,4}$/.test(value)) return null;
  const articleNumber = Number(value);
  return articleNumber <= 99999 ? articleNumber : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export async function generateMetadata({
  params,
}: NewsArticlePageProps): Promise<Metadata> {
  const { articleNumber: rawArticleNumber } = await params;
  const articleNumber = parseArticleNumber(rawArticleNumber);

  if (!articleNumber) {
    return {
      title: "Không tìm thấy bài viết - ZPATH",
    };
  }

  try {
    const article = await getPublishedNewsArticleByNumber(articleNumber);

    if (!article) {
      return {
        title: "Không tìm thấy bài viết - ZPATH",
      };
    }

    return {
      title: `${article.title} - ZPATH`,
      description: article.excerpt,
      openGraph: {
        title: article.title,
        description: article.excerpt,
        images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
        type: "article",
      },
    };
  } catch {
    return {
      title: "Bài viết ZPATH",
    };
  }
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { articleNumber: rawArticleNumber } = await params;
  const articleNumber = parseArticleNumber(rawArticleNumber);
  if (!articleNumber) notFound();

  const article = await getPublishedNewsArticleByNumber(articleNumber);
  if (!article) notFound();

  return (
    <article className="bg-background">
      <div className="container-page py-8 sm:py-10">
        <Button asChild variant="outline" size="sm">
          <Link href="/news">
            <ChevronLeft className="h-4 w-4" />
            Bảng tin
          </Link>
        </Button>

        <header className="mx-auto mt-8 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary">
              {article.tag}
            </span>
            <span>#{article.articleNumber}</span>
            <span>{formatDate(article.createdAt)}</span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {article.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime}
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-foreground md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">{article.excerpt}</p>
        </header>

        <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-lg border bg-card">
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.coverImageUrl} alt="" className="max-h-[560px] w-full object-cover" />
          ) : (
            <div className={`h-52 bg-gradient-to-br md:h-72 ${article.imageGradient}`} />
          )}
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-lg border bg-card p-5 shadow-sm sm:p-8">
          <MarkdownPreview markdown={article.contentMarkdown} className="text-base" />
        </div>
      </div>
    </article>
  );
}
