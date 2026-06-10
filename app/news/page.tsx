import type { Metadata } from "next";

import { NewsArticleList } from "@/components/news/NewsArticleList";
import { listNewsArticles } from "@/lib/news-server";
import { STATIC_NEWS_ARTICLES } from "@/lib/static-news-routes";
import type { NewsArticle } from "@/types/news";

export const metadata: Metadata = {
  title: "Bảng tin tuyển sinh và hướng nghiệp",
  description:
    "Cập nhật tin tức tuyển sinh, hướng nghiệp và các bài viết từ cộng đồng ZPATH.",
  alternates: {
    canonical: "/news",
  },
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  let articles: NewsArticle[] = STATIC_NEWS_ARTICLES;

  try {
    const dynamicArticles = await listNewsArticles({ scope: "published" });
    const staticSlugs = new Set(STATIC_NEWS_ARTICLES.map((article) => article.slug));
    articles = [
      ...STATIC_NEWS_ARTICLES,
      ...dynamicArticles.filter((article) => !staticSlugs.has(article.slug)),
    ];
  } catch (error) {
    console.error("Cannot load news articles:", error);
  }

  return <NewsArticleList articles={articles} />;
}
