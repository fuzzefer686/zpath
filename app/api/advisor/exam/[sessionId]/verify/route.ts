import { NextResponse } from "next/server";

import { verifyFullExamAnswer } from "@/lib/advisor/exam";

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
    const firstAnswer = readOptionalString(body?.firstAnswer);

    if (!firstAnswer) {
      return NextResponse.json(
        { error: { message: "Thiếu lời giải lần 1 để kiểm tra." } },
        { status: 400 },
      );
    }

    const results = await verifyFullExamAnswer({
      sessionId,
      firstAnswer,
      anonymousId: readOptionalString(body?.anonymousId),
    });

    if (!results) {
      return NextResponse.json(
        { error: { message: "Không tìm thấy phiên đọc đề." } },
        { status: 404 },
      );
    }

    return NextResponse.json({
      progress: "Đã tự kiểm tra xong 2/2",
      verifications: results,
    });
  } catch (error) {
    console.error("POST /api/advisor/exam/[sessionId]/verify error:", error);
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Không thể kiểm tra lời giải.",
        },
      },
      { status: 500 },
    );
  }
}
