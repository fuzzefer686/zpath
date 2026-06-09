export type NewsArticleStatus = "draft" | "published" | "pending_review" | "rejected";

export const NEWS_CATEGORIES = [
  "Tuyển sinh 2026",
  "Học bổng",
  "Hướng nghiệp",
  "Tư vấn",
  "Kỹ năng",
  "Học tập",
  "Tin tức",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type NewsArticle = {
  id: string;
  articleNumber: number | null;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  author: string;
  readTime: string;
  featured: boolean;
  imageGradient: string;
  coverImageUrl: string | null;
  status: NewsArticleStatus;
  moderationNote: string | null;
  ownerId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsArticleInput = {
  title: string;
  tag: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageUrl?: string | null;
  status?: Extract<NewsArticleStatus, "draft" | "published">;
  featured?: boolean;
};

export type NewsImageUploadResult = {
  path: string;
  publicUrl: string;
};
