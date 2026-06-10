import { NEWS_ARTICLES } from "@/data/news";
import type { NewsArticle } from "@/types/news";

function parseVietnameseDate(value: string) {
  const [day, month, year] = value.split("/").map((part) => Number.parseInt(part, 10));
  if (!day || !month || !year) return new Date().toISOString();

  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function mapFallbackArticle(article: (typeof NEWS_ARTICLES)[number]): NewsArticle {
  const articleNumber = Number.parseInt(article.id, 10);
  const createdAt = parseVietnameseDate(article.date);

  return {
    id: `fallback-${article.id}`,
    articleNumber: Number.isInteger(articleNumber) ? articleNumber : null,
    slug: article.slug,
    tag: article.tag,
    title: article.title,
    excerpt: article.excerpt,
    contentMarkdown: article.content,
    author: article.author,
    readTime: article.readTime,
    featured: Boolean(article.featured),
    imageGradient: article.imageGradient,
    coverImageUrl: null,
    status: "published",
    moderationNote: null,
    ownerId: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

export function listFallbackNewsArticles() {
  return NEWS_ARTICLES.map(mapFallbackArticle).sort((left, right) => {
    if (left.featured !== right.featured) return left.featured ? -1 : 1;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function getFallbackNewsArticleBySlug(slug: string) {
  return listFallbackNewsArticles().find((article) => article.slug === slug) ?? null;
}

export function getFallbackNewsArticleByNumber(articleNumber: number) {
  return listFallbackNewsArticles().find((article) => article.articleNumber === articleNumber) ?? null;
}
