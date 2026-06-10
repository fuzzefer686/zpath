import "server-only";

import {
  getFallbackNewsArticleByNumber,
  getFallbackNewsArticleBySlug,
  listFallbackNewsArticles,
} from "@/lib/news-fallbacks";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { NEWS_CATEGORIES, type NewsArticle, type NewsArticleInput, type NewsArticleStatus } from "@/types/news";
import type { ZpathAuthUser } from "@/lib/zpath-auth";

const DEFAULT_IMAGE_GRADIENT = "from-primary/40 via-accent/40 to-secondary/60";
const DEFAULT_AUTHOR = "Ban biên tập ZPATH";
const ARTICLE_SELECT = `
  id,
  article_number,
  slug,
  tag,
  title,
  excerpt,
  content,
  content_markdown,
  author,
  read_time,
  featured,
  image_gradient,
  cover_image_url,
  status,
  moderation_note,
  owner_id,
  reviewed_by,
  reviewed_at,
  created_at,
  updated_at
`;

type NewsArticleRow = {
  id: string;
  article_number: number | null;
  slug: string;
  tag: string | null;
  title: string;
  excerpt: string | null;
  content: string | null;
  content_markdown: string | null;
  author: string | null;
  read_time: string | null;
  featured: boolean | null;
  image_gradient: string | null;
  cover_image_url: string | null;
  status: NewsArticleStatus | null;
  moderation_note: string | null;
  owner_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ListNewsArticlesOptions = {
  scope?: "published" | "mine" | "admin";
  userId?: string;
};

export class NewsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewsValidationError";
  }
}

export function isNewsSchemaMissingError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  const message = typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    maybeError.code === "42703" ||
    message.includes("content_markdown") ||
    message.includes("article_number") ||
    message.includes("owner_id") ||
    message.includes("cover_image_url") ||
    message.includes("news-images")
  );
}

function isSupabaseNetworkError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { message?: unknown; details?: unknown; cause?: unknown };
  const text = [
    maybeError.message,
    maybeError.details,
    maybeError.cause instanceof Error ? maybeError.cause.message : undefined,
  ]
    .filter((value): value is string => typeof value === "string")
    .join("\n");

  return (
    text.includes("fetch failed") ||
    text.includes("ENOTFOUND") ||
    text.includes("ECONNREFUSED") ||
    text.includes("ETIMEDOUT") ||
    text.includes("EAI_AGAIN")
  );
}

function warnNewsFallback(operation: string, error: unknown) {
  const message = error instanceof Error ? error.message : "unknown Supabase error";
  console.warn(`News Supabase unavailable while ${operation}; using local fallback articles.`, message);
}

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeSlugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function estimateReadTime(markdown: string) {
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 220));
  return `${minutes} phút đọc`;
}

function mapNewsArticle(row: NewsArticleRow): NewsArticle {
  return {
    id: row.id,
    articleNumber: row.article_number,
    slug: row.slug,
    tag: row.tag ?? "",
    title: row.title,
    excerpt: row.excerpt ?? "",
    contentMarkdown: row.content_markdown ?? row.content ?? "",
    author: row.author ?? DEFAULT_AUTHOR,
    readTime: row.read_time ?? estimateReadTime(row.content_markdown ?? row.content ?? ""),
    featured: Boolean(row.featured),
    imageGradient: row.image_gradient ?? DEFAULT_IMAGE_GRADIENT,
    coverImageUrl: row.cover_image_url,
    status: row.status ?? "published",
    moderationNote: row.moderation_note,
    ownerId: row.owner_id,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sanitizeNewsArticleInput(
  value: unknown,
  options: { allowFeatured: boolean },
): NewsArticleInput {
  const body = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const title = normalizeString(body.title);
  const tag = normalizeString(body.tag, "Tin tức");
  const excerpt = normalizeString(body.excerpt);
  const contentMarkdown = normalizeString(body.contentMarkdown);
  const status = body.status === "draft" ? "draft" : "published";
  const coverImageUrl = normalizeString(body.coverImageUrl) || null;

  if (!title) throw new NewsValidationError("Tiêu đề bài viết không được để trống.");
  if (!NEWS_CATEGORIES.includes(tag as (typeof NEWS_CATEGORIES)[number])) {
    throw new NewsValidationError("Chuyên mục bài viết không hợp lệ.");
  }
  if (!excerpt) throw new NewsValidationError("Tóm tắt bài viết không được để trống.");
  if (!contentMarkdown) throw new NewsValidationError("Nội dung Markdown không được để trống.");

  return {
    title,
    tag,
    excerpt,
    contentMarkdown,
    coverImageUrl,
    status,
    featured: options.allowFeatured ? Boolean(body.featured) : false,
  };
}

export async function listNewsArticles(options: ListNewsArticlesOptions = {}) {
  const scope = options.scope ?? "published";
  let query = supabaseServer
    .from("news_articles")
    .select(ARTICLE_SELECT)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (scope === "mine") {
    if (!options.userId) return [];
    query = query.eq("owner_id", options.userId);
  } else if (scope === "admin") {
    if (!options.userId) return [];
  } else {
    query = query.eq("status", "published").eq("published", true);
  }

  try {
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as NewsArticleRow[]).map(mapNewsArticle);
  } catch (error) {
    if (scope === "published" && isSupabaseNetworkError(error)) {
      warnNewsFallback("listing published news", error);
      return listFallbackNewsArticles();
    }

    throw error;
  }
}

export async function createNewsArticle(input: NewsArticleInput, user: ZpathAuthUser) {
  const status = input.status ?? "published";
  const slug = await getAvailableSlug(input.title);

  const { data, error } = await supabaseServer
    .from("news_articles")
    .insert({
      slug,
      tag: input.tag,
      title: input.title,
      excerpt: input.excerpt,
      content: input.contentMarkdown,
      content_markdown: input.contentMarkdown,
      author: user.username || DEFAULT_AUTHOR,
      read_time: estimateReadTime(input.contentMarkdown),
      featured: Boolean(input.featured),
      image_gradient: DEFAULT_IMAGE_GRADIENT,
      cover_image_url: input.coverImageUrl,
      status,
      published: status === "published",
      owner_id: user.id,
    })
    .select(ARTICLE_SELECT)
    .single();

  if (error) throw error;
  return mapNewsArticle(data as NewsArticleRow);
}

export async function createPublicNewsArticle(input: NewsArticleInput) {
  const status = input.status ?? "published";
  const slug = await getAvailableSlug(input.title);

  const { data, error } = await supabaseServer
    .from("news_articles")
    .insert({
      slug,
      tag: input.tag,
      title: input.title,
      excerpt: input.excerpt,
      content: input.contentMarkdown,
      content_markdown: input.contentMarkdown,
      author: DEFAULT_AUTHOR,
      read_time: estimateReadTime(input.contentMarkdown),
      featured: false,
      image_gradient: DEFAULT_IMAGE_GRADIENT,
      cover_image_url: input.coverImageUrl,
      status,
      published: status === "published",
      owner_id: null,
    })
    .select(ARTICLE_SELECT)
    .single();

  if (error) throw error;
  return mapNewsArticle(data as NewsArticleRow);
}

export async function getPublishedNewsArticleByNumber(articleNumber: number) {
  if (!Number.isInteger(articleNumber) || articleNumber < 1 || articleNumber > 99999) {
    return null;
  }

  try {
    const { data, error } = await supabaseServer
      .from("news_articles")
      .select(ARTICLE_SELECT)
      .eq("article_number", articleNumber)
      .eq("status", "published")
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    return data ? mapNewsArticle(data as NewsArticleRow) : null;
  } catch (error) {
    if (isSupabaseNetworkError(error)) {
      warnNewsFallback(`loading published news #${articleNumber}`, error);
      return getFallbackNewsArticleByNumber(articleNumber);
    }

    throw error;
  }
}

export async function getPublishedNewsArticleBySlug(slug: string) {
  const normalizedSlug = normalizeSlugPart(slug);
  if (!normalizedSlug || normalizedSlug !== slug) return null;

  try {
    const { data, error } = await supabaseServer
      .from("news_articles")
      .select(ARTICLE_SELECT)
      .eq("slug", normalizedSlug)
      .eq("status", "published")
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    return data ? mapNewsArticle(data as NewsArticleRow) : null;
  } catch (error) {
    if (isSupabaseNetworkError(error)) {
      warnNewsFallback(`loading published news slug "${normalizedSlug}"`, error);
      return getFallbackNewsArticleBySlug(normalizedSlug);
    }

    throw error;
  }
}

export async function getEditableNewsArticleById(id: string, user: ZpathAuthUser) {
  const article = await getNewsArticleById(id);
  if (!article) return null;
  if (article.ownerId !== user.id && user.role !== "admin") {
    throw new NewsValidationError("Bạn không có quyền sửa bài viết này.");
  }

  return article;
}

export async function updateNewsArticle(
  id: string,
  input: NewsArticleInput,
  user: ZpathAuthUser,
) {
  const existing = await getNewsArticleById(id);
  if (!existing) return null;
  if (existing.ownerId !== user.id && user.role !== "admin") {
    throw new NewsValidationError("Bạn không có quyền sửa bài viết này.");
  }

  const requestedSlug = normalizeSlugPart(input.title);
  const slug = await getAvailableSlug(requestedSlug, id);
  const status = input.status ?? "published";

  const { data, error } = await supabaseServer
    .from("news_articles")
    .update({
      slug,
      tag: input.tag,
      title: input.title,
      excerpt: input.excerpt,
      content: input.contentMarkdown,
      content_markdown: input.contentMarkdown,
      read_time: estimateReadTime(input.contentMarkdown),
      featured: user.role === "admin" ? Boolean(input.featured) : existing.featured,
      cover_image_url: input.coverImageUrl,
      status,
      published: status === "published",
      moderation_note: null,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ARTICLE_SELECT)
    .single();

  if (error) throw error;
  return mapNewsArticle(data as NewsArticleRow);
}

export async function deleteNewsArticle(id: string, user: ZpathAuthUser) {
  const existing = await getNewsArticleById(id);
  if (!existing) return false;
  if (existing.ownerId !== user.id && user.role !== "admin") {
    throw new NewsValidationError("Bạn không có quyền xóa bài viết này.");
  }

  const { error } = await supabaseServer.from("news_articles").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function moderateNewsArticle(
  id: string,
  action: "approve" | "reject" | "pending_review",
  user: ZpathAuthUser,
  note?: string,
) {
  if (user.role !== "admin") {
    throw new NewsValidationError("Bạn không có quyền kiểm duyệt bài viết.");
  }

  const status: NewsArticleStatus =
    action === "approve" ? "published" : action === "reject" ? "rejected" : "pending_review";

  const { data, error } = await supabaseServer
    .from("news_articles")
    .update({
      status,
      published: status === "published",
      moderation_note: note?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ARTICLE_SELECT)
    .single();

  if (error) throw error;
  return mapNewsArticle(data as NewsArticleRow);
}

async function getNewsArticleById(id: string) {
  const { data, error } = await supabaseServer
    .from("news_articles")
    .select(ARTICLE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapNewsArticle(data as NewsArticleRow) : null;
}

async function getAvailableSlug(rawSlug: string, currentId?: string) {
  const baseSlug = normalizeSlugPart(rawSlug) || "bai-viet";
  let candidate = baseSlug;
  let suffix = 2;

  for (;;) {
    let query = supabaseServer
      .from("news_articles")
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (currentId) query = query.neq("id", currentId);

    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) return candidate;

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
