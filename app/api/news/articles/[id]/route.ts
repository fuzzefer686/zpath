import { NextResponse } from "next/server";

import {
  deleteNewsArticle,
  isNewsSchemaMissingError,
  NewsValidationError,
  sanitizeNewsArticleInput,
  updateNewsArticle,
} from "@/lib/news-server";
import { getAuthContext } from "@/lib/zpath-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function toErrorResponse(error: unknown, fallback: string) {
  if (error instanceof NewsValidationError) {
    const status = error.message.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (isNewsSchemaMissingError(error)) {
    return NextResponse.json(
      {
        error:
          "Database News chưa áp dụng migration news_markdown_crud. Hãy chạy migration Supabase trước khi sửa hoặc xóa bài viết.",
      },
      { status: 503 },
    );
  }

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const { id } = await context.params;
    const input = sanitizeNewsArticleInput(await request.json(), {
      allowFeatured: auth.user.role === "admin",
    });
    const article = await updateNewsArticle(id, input, auth.user);

    if (!article) {
      return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (error) {
    return toErrorResponse(error, "Không thể cập nhật bài viết.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const { id } = await context.params;
    const deleted = await deleteNewsArticle(id, auth.user);

    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy bài viết." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "Không thể xóa bài viết.");
  }
}
