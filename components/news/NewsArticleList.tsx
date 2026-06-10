"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, FileText, Search, Tag, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getNewsArticleHref } from "@/lib/news-links";
import type { NewsArticle } from "@/types/news";

type NewsArticleListProps = {
  articles: NewsArticle[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function NewsArticleList({ articles }: NewsArticleListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = useMemo(
    () => Array.from(new Set(articles.map((article) => article.tag).filter(Boolean))),
    [articles],
  );
  const filteredArticles = articles.filter((article) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesTag = !activeTag || article.tag === activeTag;
    const matchesSearch =
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      article.contentMarkdown.toLowerCase().includes(query);

    return matchesTag && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border">
        <div className="container-page py-10 sm:py-14">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                <FileText className="h-3.5 w-3.5" />
                Bảng tin ZPATH
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                News
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Tin tuyển sinh, học tập và định hướng nghề nghiệp từ ZPATH.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/news/manage">Bài của tôi</Link>
              </Button>
              <Button asChild variant="hero">
                <Link href="/news/editor/new">Viết bài</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container-page flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                !activeTag ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              Tất cả
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold ${
                  activeTag === tag ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <Tag className="h-3 w-3" />
                {tag}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm kiếm bài viết..."
              className="pl-10"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-8">
        <div className="space-y-4">
          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                Không có bài viết phù hợp.
              </CardContent>
            </Card>
          ) : (
            filteredArticles.map((article) => (
              <ArticleListItem key={article.id} article={article} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ArticleListItem({ article }: { article: NewsArticle }) {
  const articleHref = getNewsArticleHref(article);

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[220px_1fr] sm:gap-5">
        <Link
          href={articleHref}
          className="block aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
        >
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${article.imageGradient}`} />
          )}
        </Link>
        <div className="min-w-0 py-1">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">
              {article.tag}
            </span>
            {article.articleNumber && <span>#{article.articleNumber}</span>}
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readTime}
            </span>
            <span>{formatDate(article.createdAt)}</span>
          </div>
          <Link href={articleHref} className="group">
            <h2 className="mt-3 text-xl font-black leading-tight transition-colors group-hover:text-primary">
              {article.title}
            </h2>
          </Link>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {article.excerpt}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href={articleHref}>Đọc bài</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
