import type { NewsArticle } from "@/types/news";

export function getNewsArticleHref(article: Pick<NewsArticle, "href" | "slug" | "articleNumber">) {
  if (article.href) return article.href;
  if (article.slug) return `/blog/${article.slug}`;
  if (article.articleNumber) return `/news/${article.articleNumber}`;
  return "/news";
}
