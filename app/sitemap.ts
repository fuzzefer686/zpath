import type { MetadataRoute } from "next";

import { createSchoolSlug } from "@/lib/school-slug";
import { getAbsoluteUrl } from "@/lib/seo";
import { getVisibleUnimapUniversities } from "@/lib/unimap-visible-schools";
import { listNewsArticles } from "@/lib/news-server";
import { STATIC_NEWS_ARTICLES } from "@/lib/static-news-routes";
import { getSchoolSlugs } from "@/src/lib/admission-data";

export const dynamic = "force-dynamic";

function createSitemapEntry(
  path: string,
  options: {
    lastModified?: string | Date;
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority?: number;
  } = {},
): MetadataRoute.Sitemap[number] {
  return {
    url: getAbsoluteUrl(path),
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency,
    priority: options.priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    createSitemapEntry("/", { changeFrequency: "weekly", priority: 1 }),
    createSitemapEntry("/unimap", { changeFrequency: "weekly", priority: 0.9 }),
    createSitemapEntry("/news", { changeFrequency: "daily", priority: 0.8 }),
    ...STATIC_NEWS_ARTICLES.map((article) =>
      createSitemapEntry(article.href ?? `/news/${article.slug}`, {
        lastModified: article.updatedAt,
        changeFrequency: "daily",
        priority: 0.85,
      }),
    ),
  ];

  const unimapRouteParams = new Set<string>();

  getVisibleUnimapUniversities().forEach((university) => {
    unimapRouteParams.add(university.code.toLowerCase());
    unimapRouteParams.add(createSchoolSlug(university.name));
  });

  try {
    const schoolSlugs = await getSchoolSlugs();
    schoolSlugs.forEach((slug) => unimapRouteParams.add(slug));
  } catch (error) {
    console.error("Cannot load school slugs for sitemap:", error);
  }

  unimapRouteParams.forEach((routeParam) => {
    entries.push(
      createSitemapEntry(`/unimap/${routeParam}`, {
        changeFrequency: "weekly",
        priority: 0.85,
      }),
    );
  });

  try {
    const articles = await listNewsArticles({ scope: "published" });
    articles.forEach((article) => {
      entries.push(
        createSitemapEntry(`/blog/${article.slug}`, {
          lastModified: article.updatedAt,
          changeFrequency: "weekly",
          priority: article.featured ? 0.8 : 0.7,
        }),
      );
    });
  } catch (error) {
    console.error("Cannot load news articles for sitemap:", error);
  }

  return entries;
}
