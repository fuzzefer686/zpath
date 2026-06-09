"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Edit3, Loader2, Plus, Trash2 } from "lucide-react";

import { useAuth } from "@/components/zpath/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNewsArticles } from "@/hooks/useNewsArticles";
import type { NewsArticle } from "@/types/news";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function NewsManager() {
  const { user, openAuthPrompt } = useAuth();
  const { myArticles, isLoading, error, loadMyArticles, deleteArticle } = useNewsArticles({
    initialArticles: [],
  });

  useEffect(() => {
    if (user) void loadMyArticles();
  }, [loadMyArticles, user]);

  const handleDelete = async (article: NewsArticle) => {
    if (!window.confirm(`Xóa bài viết "${article.title}"?`)) return;
    await deleteArticle(article.id);
  };

  if (!user) {
    return (
      <div className="container-page py-12">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <h1 className="text-2xl font-black">Quản lý bài viết</h1>
            <p className="text-sm text-muted-foreground">Đăng nhập để xem và quản lý bài viết của bạn.</p>
            <Button onClick={openAuthPrompt}>Đăng nhập</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Bài viết của tôi</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tạo, sửa và xóa bài viết News.</p>
        </div>
        <Button asChild variant="hero">
          <Link href="/news/editor/new">
            <Plus className="h-4 w-4" />
            Viết bài mới
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải bài viết...
          </CardContent>
        </Card>
      ) : myArticles.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Bạn chưa có bài viết nào.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {myArticles.map((article) => (
            <Card key={article.id}>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
                  {article.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${article.imageGradient}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">
                      {article.tag}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 font-bold uppercase">
                      {article.status}
                    </span>
                    <span>{formatDate(article.updatedAt)}</span>
                    {article.articleNumber && <span>#{article.articleNumber}</span>}
                  </div>
                  <h2 className="mt-2 text-lg font-black leading-tight">{article.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/news/editor/${article.id}`}>
                      <Edit3 className="h-4 w-4" />
                      Sửa
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDelete(article)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
