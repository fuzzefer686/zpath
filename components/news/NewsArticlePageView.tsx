import Link from "next/link";
import { ChevronLeft, Clock, User } from "lucide-react";

import { MarkdownPreview } from "@/components/news/MarkdownPreview";
import { Button } from "@/components/ui/button";
import type { NewsArticle } from "@/types/news";

type NewsArticlePageViewProps = {
  article: NewsArticle;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function NewsArticlePageView({ article }: NewsArticlePageViewProps) {
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
            {article.articleNumber && <span>#{article.articleNumber}</span>}
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
