import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { listAdminNewsArticles } from "@/lib/admin-server";
import type { NewsArticle } from "@/types/news";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminNewsPage() {
  let articles: NewsArticle[] = [];
  let loadError: string | null = null;

  try {
    articles = await listAdminNewsArticles();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Không thể tải bài viết.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">News moderation</h2>
          <p className="mt-2 text-sm text-muted-foreground">Danh sách bài viết và trạng thái.</p>
        </div>
        <Link href="/news/editor/new" className="text-sm font-bold text-primary">
          Tạo bài viết
        </Link>
      </div>

      {loadError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">
                      {article.tag}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 font-bold uppercase">
                      {article.status}
                    </span>
                    {article.articleNumber && <span>#{article.articleNumber}</span>}
                    <span>{formatDate(article.updatedAt)}</span>
                  </div>
                  <h3 className="mt-2 font-black">{article.title}</h3>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{article.excerpt}</p>
                </div>
                <Link href={`/news/editor/${article.id}`} className="text-sm font-bold text-primary">
                  Sửa
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
