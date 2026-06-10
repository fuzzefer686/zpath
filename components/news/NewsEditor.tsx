"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp, ImagePlus, Loader2, Trash2 } from "lucide-react";

import { MarkdownPreview } from "@/components/news/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getNewsArticleHref } from "@/lib/news-links";
import { useNewsArticles } from "@/hooks/useNewsArticles";
import {
  NEWS_CATEGORIES,
  type NewsArticle,
  type NewsArticleInput,
  type NewsArticleStatus,
} from "@/types/news";

type EditorState = {
  title: string;
  tag: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageUrl: string;
  status: Extract<NewsArticleStatus, "draft" | "published">;
};

type NewsEditorProps = {
  article?: NewsArticle | null;
};

const emptyEditorState: EditorState = {
  title: "",
  tag: "Tuyển sinh 2026",
  excerpt: "",
  contentMarkdown: "",
  coverImageUrl: "",
  status: "published",
};

function articleToEditorState(article: NewsArticle): EditorState {
  return {
    title: article.title,
    tag: article.tag,
    excerpt: article.excerpt,
    contentMarkdown: article.contentMarkdown,
    coverImageUrl: article.coverImageUrl ?? "",
    status: article.status === "draft" ? "draft" : "published",
  };
}

function toInput(state: EditorState): NewsArticleInput {
  return {
    title: state.title,
    tag: state.tag,
    excerpt: state.excerpt,
    contentMarkdown: state.contentMarkdown,
    coverImageUrl: state.coverImageUrl || null,
    status: state.status,
  };
}

export function NewsEditor({ article }: NewsEditorProps) {
  const router = useRouter();
  const { isLoading, error, setError, saveArticle, uploadImage, deleteImage } = useNewsArticles({
    initialArticles: [],
  });
  const [editor, setEditor] = useState<EditorState>(
    article ? articleToEditorState(article) : emptyEditorState,
  );
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      const savedArticle = await saveArticle(toInput(editor), article?.id);
      setMessage("Đã lưu bài viết.");
      router.push(getNewsArticleHref(savedArticle));
    } catch {
      setMessage(null);
    }
  };

  const handleMarkdownImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.endsWith(".md") && file.type !== "text/markdown" && file.type !== "text/plain") {
      setError("Chỉ hỗ trợ import file .md hoặc text.");
      return;
    }

    const markdown = await file.text();
    setEditor((current) => ({
      ...current,
      title: current.title || file.name.replace(/\.md$/i, ""),
      contentMarkdown: markdown,
    }));
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const publicUrl = await uploadImage(file);
      setEditor((current) => ({
        ...current,
        coverImageUrl: current.coverImageUrl || publicUrl,
        contentMarkdown: `${current.contentMarkdown.trim()}\n\n![${file.name}](${publicUrl})`.trim(),
      }));
      setMessage("Đã tải ảnh và chèn vào Markdown.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh.");
    }
  };

  const handleDeleteCoverImage = async () => {
    if (!editor.coverImageUrl) return;

    try {
      await deleteImage(editor.coverImageUrl);
      setEditor((current) => ({ ...current, coverImageUrl: "" }));
      setMessage("Đã xóa ảnh cover khỏi Storage.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa ảnh cover.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="container-page py-8">
        {(error || message) && (
          <div
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              error
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-primary/20 bg-primary/5 text-primary"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.65fr)]">
          <Card className="overflow-hidden">
            {editor.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={editor.coverImageUrl} alt="" className="h-64 w-full object-cover" />
            ) : (
              <div className="h-28 bg-gradient-to-br from-primary/25 via-accent/20 to-secondary/30" />
            )}
            <CardContent className="p-5 sm:p-7">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">
                  {editor.tag}
                </span>
                <span>{editor.status === "draft" ? "Bản nháp" : "Xuất bản"}</span>
              </div>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
                {editor.title || "Tiêu đề bài viết"}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                {editor.excerpt || "Tóm tắt bài viết sẽ hiển thị tại đây."}
              </p>
              <div className="mt-6 border-t pt-6">
                {editor.contentMarkdown ? (
                  <MarkdownPreview markdown={editor.contentMarkdown} />
                ) : (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                    Nội dung Markdown sẽ hiển thị tại đây.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="xl:sticky xl:top-32 xl:self-start">
            <CardHeader>
              <CardTitle className="text-lg">{article ? "Sửa bài viết" : "Tạo bài viết"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
                <Input
                  value={editor.title}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Tiêu đề"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editor.tag}
                    onChange={(event) =>
                      setEditor((current) => ({ ...current, tag: event.target.value }))
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    required
                  >
                    {NEWS_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editor.status}
                    onChange={(event) =>
                      setEditor((current) => ({
                        ...current,
                        status: event.target.value === "draft" ? "draft" : "published",
                      }))
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="published">Xuất bản ngay</option>
                    <option value="draft">Lưu nháp</option>
                  </select>
                </div>
                <textarea
                  value={editor.excerpt}
                  onChange={(event) =>
                    setEditor((current) => ({ ...current, excerpt: event.target.value }))
                  }
                  placeholder="Tóm tắt SEO"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={editor.coverImageUrl}
                    onChange={(event) =>
                      setEditor((current) => ({ ...current, coverImageUrl: event.target.value }))
                    }
                    placeholder="Cover image URL"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleDeleteCoverImage()}
                    disabled={!editor.coverImageUrl || isLoading}
                    className="gap-2 rounded-full text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa ảnh
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-foreground/15 text-xs font-bold hover:border-primary hover:text-primary">
                    <FileUp className="h-4 w-4" />
                    Import .md
                    <input
                      type="file"
                      accept=".md,text/markdown,text/plain"
                      onChange={(event) => void handleMarkdownImport(event)}
                      className="hidden"
                    />
                  </label>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-foreground/15 text-xs font-bold hover:border-primary hover:text-primary">
                    <ImagePlus className="h-4 w-4" />
                    Upload ảnh
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => void handleImageUpload(event)}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  value={editor.contentMarkdown}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      contentMarkdown: event.target.value,
                    }))
                  }
                  placeholder="Viết Markdown tại đây..."
                  className="min-h-[620px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Lưu bài
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push("/news/manage")}>
                    Hủy
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
