import { NextRequest, NextResponse } from "next/server";

import {
  createNewsArticle,
  isNewsSchemaMissingError,
  listNewsArticles,
  NewsValidationError,
  sanitizeNewsArticleInput,
} from "@/lib/news-server";
import { getAuthContext } from "@/lib/zpath-auth";

export const runtime = "nodejs";

function toErrorResponse(error: unknown, fallback: string) {
  if (error instanceof NewsValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (isNewsSchemaMissingError(error)) {
    return NextResponse.json(
      {
        error:
          "Database News chưa áp dụng migration news_markdown_crud. Hãy chạy migration Supabase trước khi tạo hoặc đọc bài viết.",
      },
      { status: 503 },
    );
  }

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const scopeParam = request.nextUrl.searchParams.get("scope");
    const auth = await getAuthContext();

    if (scopeParam === "mine") {
      if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
      const articles = await listNewsArticles({ scope: "mine", userId: auth.user.id });
      return NextResponse.json({ articles });
    }

    if (scopeParam === "admin") {
      if (!auth || auth.user.role !== "admin") {
        return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
      }
      const articles = await listNewsArticles({ scope: "admin", userId: auth.user.id });
      return NextResponse.json({ articles });
    }

    const articles = await listNewsArticles({ scope: "published" });
    return NextResponse.json({ articles });
  } catch (error) {
    return toErrorResponse(error, "Không thể lấy danh sách bài viết.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const input = sanitizeNewsArticleInput(await request.json(), {
      allowFeatured: auth.user.role === "admin",
    });
    const article = await createNewsArticle(input, auth.user);

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Không thể tạo bài viết.");
  }
}
