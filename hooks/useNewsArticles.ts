"use client";

import { useCallback, useState } from "react";

import type { NewsArticle, NewsArticleInput, NewsImageUploadResult } from "@/types/news";

type ArticlesResponse = {
  articles: NewsArticle[];
};

type ArticleResponse = {
  article: NewsArticle;
};

type UseNewsArticlesOptions = {
  initialArticles: NewsArticle[];
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Không thể xử lý yêu cầu.");
  }
  return data as T;
}

export function useNewsArticles({ initialArticles }: UseNewsArticlesOptions) {
  const [publishedArticles, setPublishedArticles] = useState(initialArticles);
  const [myArticles, setMyArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPublishedArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await parseJsonResponse<ArticlesResponse>(
        await fetch("/api/news/articles", { cache: "no-store" }),
      );
      setPublishedArticles(data.articles);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải bài viết.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMyArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await parseJsonResponse<ArticlesResponse>(
        await fetch("/api/news/articles?scope=mine", { cache: "no-store" }),
      );
      setMyArticles(data.articles);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải bài của bạn.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveArticle = useCallback(async (input: NewsArticleInput, id?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await parseJsonResponse<ArticleResponse>(
        await fetch(id ? `/api/news/articles/${id}` : "/api/news/articles", {
          method: id ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        }),
      );

      setMyArticles((articles) => {
        const existingIndex = articles.findIndex((article) => article.id === data.article.id);
        if (existingIndex === -1) return [data.article, ...articles];
        return articles.map((article) => (article.id === data.article.id ? data.article : article));
      });

      setPublishedArticles((articles) => {
        const withoutCurrent = articles.filter((article) => article.id !== data.article.id);
        return data.article.status === "published"
          ? [data.article, ...withoutCurrent]
          : withoutCurrent;
      });

      return data.article;
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Không thể lưu bài viết.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteArticle = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await parseJsonResponse<{ success: boolean }>(
        await fetch(`/api/news/articles/${id}`, { method: "DELETE" }),
      );
      setMyArticles((articles) => articles.filter((article) => article.id !== id));
      setPublishedArticles((articles) => articles.filter((article) => article.id !== id));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Không thể xóa bài viết.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const data = await parseJsonResponse<NewsImageUploadResult>(
      await fetch("/api/news/images", {
        method: "POST",
        body: formData,
      }),
    );

    return data.publicUrl;
  }, []);

  return {
    publishedArticles,
    myArticles,
    isLoading,
    error,
    setError,
    loadPublishedArticles,
    loadMyArticles,
    saveArticle,
    deleteArticle,
    uploadImage,
  };
}
