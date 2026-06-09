import { NextResponse } from "next/server";

import { answerExamQuestion, type ZpathExamAnswerAction } from "@/lib/advisor/exam";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readAnswerAction(value: unknown): ZpathExamAnswerAction {
  return value === "next" ||
    value === "full" ||
    value === "full_answers_only" ||
    value === "custom"
    ? value
    : "custom";
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await answerExamQuestion({
      sessionId,
      prompt: readOptionalString(body?.message),
      action: readAnswerAction(body?.action),
      anonymousId: readOptionalString(body?.anonymousId),
    });

    if (!result) {
      return NextResponse.json(
        { error: { message: "Không tìm thấy phiên đọc đề." } },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/advisor/exam/[sessionId]/answer error:", error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : "Không thể giải đề.",
        },
      },
      { status: 500 },
    );
  }
}
