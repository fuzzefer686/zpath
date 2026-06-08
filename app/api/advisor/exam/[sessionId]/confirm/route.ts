import { NextResponse } from "next/server";

import { confirmExamSession } from "@/lib/advisor/exam";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const session = await confirmExamSession({
      sessionId,
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
    console.error("POST /api/advisor/exam/[sessionId]/confirm error:", error);
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Không thể xác nhận đề thi.",
        },
      },
      { status: 500 },
    );
  }
}
