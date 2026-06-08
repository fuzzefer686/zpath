import { NextResponse } from "next/server";

import { createExamSessionFromUpload, validateExamImageFiles } from "@/lib/advisor/exam";

export const runtime = "nodejs";

function errorResponse(error: unknown, fallback: string, status = 500) {
  const rawMessage = error instanceof Error ? error.message : fallback;
  const message = rawMessage.includes("MAX_TOKENS")
    ? "Đề quá dài so với giới hạn OCR hiện tại. Hãy thử giảm số ảnh, cắt ảnh sát vùng đề, hoặc tải từng phần."
    : rawMessage;
  return NextResponse.json({ error: { message } }, { status });
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageValues = [
      ...formData.getAll("images[]"),
      ...formData.getAll("images"),
      ...formData.getAll("image"),
    ];
    const files = imageValues.filter(isUploadedFile);
    const anonymousId = formData.get("anonymousId");
    const conversationId = formData.get("conversationId");
    const validationError = validateExamImageFiles(files);

    if (validationError) {
      return NextResponse.json(
        { error: { message: validationError } },
        { status: 400 },
      );
    }

    const session = await createExamSessionFromUpload({
      files,
      anonymousId: typeof anonymousId === "string" ? anonymousId : undefined,
      conversationId: typeof conversationId === "string" ? conversationId : undefined,
    });

    return NextResponse.json({
      examSessionId: session.id,
      conversationId: session.conversationId,
      extractedMarkdown: session.extractedMarkdown,
      questions: session.questions,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
    });
  } catch (error) {
    console.error("POST /api/advisor/exam/upload error:", error);
    return errorResponse(error, "Không thể đọc ảnh đề thi.");
  }
}
