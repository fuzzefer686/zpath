import type { Metadata } from "next";

import { NewsArticleList } from "@/components/news/NewsArticleList";
import { listNewsArticles } from "@/lib/news-server";
import type { NewsArticle } from "@/types/news";

export const metadata: Metadata = {
  title: "News - ZPATH",
  description:
    "Cập nhật tin tức tuyển sinh, hướng nghiệp và các bài viết từ cộng đồng ZPATH.",
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  let articles: NewsArticle[] = [];

  try {
    articles = await listNewsArticles({ scope: "published" });
  } catch (error) {
    console.error("Cannot load news articles:", error);
  }

  return <NewsArticleList articles={articles} />;
}
