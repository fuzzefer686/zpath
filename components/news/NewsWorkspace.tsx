"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ChevronRight,
  Clock,
  Edit3,
  FileUp,
  ImagePlus,
  Loader2,
  Newspaper,
  Plus,
  Search,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/zpath/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getNewsArticleHref } from "@/lib/news-links";
import { useNewsArticles } from "@/hooks/useNewsArticles";
import { NEWS_CATEGORIES, type NewsArticle, type NewsArticleInput, type NewsArticleStatus } from "@/types/news";
import { MarkdownPreview } from "@/components/news/MarkdownPreview";

type NewsWorkspaceProps = {
  initialArticles: NewsArticle[];
};

type EditorState = {
  id?: string;
  title: string;
  tag: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageUrl: string;
  status: Extract<NewsArticleStatus, "draft" | "published">;
};

const emptyEditorState: EditorState = {
  title: "",
  tag: "Tuyển sinh 2026",
  excerpt: "",
  contentMarkdown: "",
  coverImageUrl: "",
  status: "published",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function articleToEditorState(article: NewsArticle): EditorState {
  return {
    id: article.id,
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

export function NewsWorkspace({ initialArticles }: NewsWorkspaceProps) {
  const { user, openAuthPrompt } = useAuth();
  const {
    publishedArticles,
    myArticles,
    isLoading,
    error,
    setError,
    loadMyArticles,
    saveArticle,
    deleteArticle,
    uploadImage,
    deleteImage,
  } = useNewsArticles({ initialArticles });
  const [activeTab, setActiveTab] = useState<"published" | "mine">("published");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditorState);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "mine" && user) void loadMyArticles();
  }, [activeTab, loadMyArticles, user]);

  const visibleArticles = activeTab === "mine" ? myArticles : publishedArticles;
  const allTags = useMemo(
    () => Array.from(new Set(publishedArticles.map((article) => article.tag).filter(Boolean))),
    [publishedArticles],
  );
  const categoryOptions = useMemo(() => {
    const categories = new Set([...NEWS_CATEGORIES, ...allTags]);
    if (editor.tag) categories.add(editor.tag);
    return Array.from(categories);
  }, [allTags, editor.tag]);
  const filteredArticles = visibleArticles.filter((article) => {
    const matchesTag = !activeTag || article.tag === activeTag;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      article.contentMarkdown.toLowerCase().includes(query);

    return matchesTag && matchesSearch;
  });

  const startNewArticle = () => {
    if (!user) {
      openAuthPrompt();
      return;
    }
    setActiveTab("mine");
    setEditor(emptyEditorState);
    setEditorOpen(true);
    setMessage(null);
    setError(null);
  };

  const editArticle = (article: NewsArticle) => {
    setActiveTab("mine");
    setEditor(articleToEditorState(article));
    setEditorOpen(true);
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      const savedArticle = await saveArticle(toInput(editor), editor.id);
      setEditor(articleToEditorState(savedArticle));
      setMessage("Đã lưu bài viết.");
      setEditorOpen(false);
    } catch {
      setMessage(null);
    }
  };

  const handleDelete = async (article: NewsArticle) => {
    const confirmed = window.confirm(`Xóa bài viết "${article.title}"?`);
    if (!confirmed) return;
    try {
      await deleteArticle(article.id);
      if (editor.id === article.id) {
        setEditor(emptyEditorState);
        setEditorOpen(false);
      }
      setMessage("Đã xóa bài viết.");
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
      <section className="border-b border-border">
        <div className="container-page py-10 sm:py-14">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              Trang chủ
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">Bảng tin</span>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                <Newspaper className="h-3.5 w-3.5" />
                Bảng tin ZPATH
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Tin tức & hướng nghiệp
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Cập nhật tuyển sinh, học tập và định hướng nghề nghiệp từ cộng đồng ZPATH.
              </p>
            </div>

            <Button onClick={startNewArticle} variant="hero" className="w-full sm:w-fit">
              <Plus className="h-4 w-4" />
              Viết bài
            </Button>
          </div>
        </div>
      </section>

      <section className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container-page flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("published")}
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                activeTab === "published" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              Đã xuất bản
            </button>
            <button
              onClick={() => {
                if (!user) openAuthPrompt();
                setActiveTab("mine");
              }}
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                activeTab === "mine" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              Bài của tôi
            </button>
            {activeTab === "published" && (
              <>
                <button
                  onClick={() => setActiveTag(null)}
                  className={`rounded-full px-4 py-2 text-xs font-bold ${
                    !activeTag ? "bg-foreground text-background" : "bg-muted"
                  }`}
                >
                  Tất cả
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold ${
                      activeTag === tag ? "bg-foreground text-background" : "bg-muted"
                    }`}
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </button>
                ))}
              </>
            )}
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

        {editorOpen ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
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
                    {editor.tag || "Tin tức"}
                  </span>
                  <span>{editor.status === "draft" ? "Bản nháp" : "Xuất bản"}</span>
                </div>
                <h2 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
                  {editor.title || "Tiêu đề bài viết"}
                </h2>
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
                <CardTitle className="text-lg">
                  {editor.id ? "Sửa bài viết" : "Tạo bài viết"}
                </CardTitle>
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
                      {categoryOptions.map((category) => (
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
                    className="min-h-[560px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Lưu bài
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditorOpen(false);
                        setEditor(emptyEditorState);
                      }}
                    >
                      Đóng
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {activeTab === "mine" && !user ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                    <User className="h-10 w-10 text-muted-foreground" />
                    <p className="font-semibold">Đăng nhập để quản lý bài viết.</p>
                    <Button onClick={openAuthPrompt}>Đăng nhập</Button>
                  </CardContent>
                </Card>
              ) : filteredArticles.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
                    <Newspaper className="h-10 w-10" />
                    <p>Không có bài viết phù hợp.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    canManage={activeTab === "mine"}
                    onEdit={() => editArticle(article)}
                    onDelete={() => void handleDelete(article)}
                  />
                ))
              )}
            </div>

            <aside className="lg:sticky lg:top-32 lg:self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Góc biên tập</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <Button onClick={startNewArticle} className="w-full">
                    <Plus className="h-4 w-4" />
                    Viết bài mới
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}

type ArticleCardProps = {
  article: NewsArticle;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function ArticleCard({ article, canManage, onEdit, onDelete }: ArticleCardProps) {
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
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readTime}
            </span>
            <span>{formatDate(article.createdAt)}</span>
            {article.articleNumber && <span>#{article.articleNumber}</span>}
            {canManage && (
              <span className="rounded-full bg-muted px-2.5 py-1 font-bold uppercase">
                {article.status}
              </span>
            )}
          </div>
          <Link href={articleHref} className="group">
            <h2 className="mt-3 text-xl font-black leading-tight transition-colors group-hover:text-primary">
              {article.title}
            </h2>
          </Link>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {article.excerpt}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={articleHref}>Đọc bài</Link>
            </Button>
            {canManage && (
              <>
                <Button onClick={onEdit} variant="outline" size="sm">
                  <Edit3 className="h-4 w-4" />
                  Sửa
                </Button>
                <Button onClick={onDelete} variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
