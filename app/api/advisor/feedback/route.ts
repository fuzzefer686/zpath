import { NextResponse } from "next/server";

import { persistAdvisorFeedback } from "@/lib/advisor/persistence";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DOWNVOTE_REASONS = new Set([
  "Thông tin sai",
  "Thiếu nguồn",
  "Trả lời chưa đúng ý",
  "Khác",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readComment(value: unknown) {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length <= 80 && DOWNVOTE_REASONS.has(trimmed)
    ? trimmed
    : undefined;
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_JSON",
            message: "Body JSON không hợp lệ.",
          },
        },
        { status: 400 },
      );
    }

    if (!isRecord(body)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_BODY",
            message: "Body phải là JSON object.",
          },
        },
        { status: 400 },
      );
    }

    const messageId =
      typeof body.messageId === "string" && UUID_PATTERN.test(body.messageId)
        ? body.messageId
        : "";
    const rating = body.rating === "up" || body.rating === "down"
      ? body.rating
      : undefined;
    const comment = readComment(body.comment);

    if (!messageId || !rating) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_FEEDBACK",
            message: "Phản hồi không hợp lệ.",
          },
        },
        { status: 400 },
      );
    }

    await persistAdvisorFeedback({
      messageId,
      rating,
      comment: rating === "down" ? comment : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Advisor feedback API error:", error);

    return NextResponse.json(
      {
        error: {
          code: "ADVISOR_FEEDBACK_FAILED",
          message: "Không thể lưu phản hồi lúc này.",
        },
      },
      { status: 500 },
    );
  }
}
