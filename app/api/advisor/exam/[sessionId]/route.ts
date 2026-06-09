import { NextResponse } from "next/server";

import { updateExamMarkdown } from "@/lib/advisor/exam";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const markdown = readOptionalString(body?.markdown);

    if (!markdown) {
      return NextResponse.json(
        { error: { message: "Nội dung đề Markdown không được để trống." } },
        { status: 400 },
      );
    }

    const session = await updateExamMarkdown({
      sessionId,
      markdown,
      anonymousId: readOptionalString(body?.anonymousId),
    });

    if (!session) {
      return NextResponse.json(
        { error: { message: "Không tìm thấy phiên đọc đề." } },
        { status: 404 },
      );
    }

    return NextResponse.json({
      examSessionId: session.id,
      conversationId: session.conversationId,
      extractedMarkdown: session.extractedMarkdown,
      questions: session.questions,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
    });
  } catch (error) {
    console.error("PATCH /api/advisor/exam/[sessionId] error:", error);
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Không thể cập nhật đề thi.",
        },
      },
      { status: 500 },
    );
  }
}
