import { NextResponse } from "next/server";

import {
  isNewsSchemaMissingError,
  moderateNewsArticle,
  NewsValidationError,
} from "@/lib/news-server";
import { getAuthContext } from "@/lib/zpath-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    if (auth.user.role !== "admin") {
      return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: "approve" | "reject" | "pending_review";
      note?: string;
    };

    if (
      body.action !== "approve" &&
      body.action !== "reject" &&
      body.action !== "pending_review"
    ) {
      return NextResponse.json({ error: "Hành động kiểm duyệt không hợp lệ." }, { status: 400 });
    }

    const article = await moderateNewsArticle(id, body.action, auth.user, body.note);
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof NewsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (isNewsSchemaMissingError(error)) {
      return NextResponse.json(
        {
          error:
            "Database News chưa áp dụng migration news_markdown_crud. Hãy chạy migration Supabase trước khi kiểm duyệt bài viết.",
        },
        { status: 503 },
      );
    }

    console.error("Không thể kiểm duyệt bài viết.", error);
    return NextResponse.json({ error: "Không thể kiểm duyệt bài viết." }, { status: 500 });
  }
}
