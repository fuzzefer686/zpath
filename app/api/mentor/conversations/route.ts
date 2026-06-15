import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import {
  assertSendRateLimit,
  listUserConversations,
  requestConsultation,
} from "@/lib/mentor/server";
import { publishConversationActivity } from "@/lib/mentor/realtime";

export const runtime = "nodejs";

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 4000;

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const conversations = await listUserConversations(auth.user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("GET /api/mentor/conversations error:", error);
    return NextResponse.json({ error: "Không thể tải hộp thư." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const subjectRaw = typeof body?.subject === "string" ? body.subject.trim() : "";

    if (message.length === 0) {
      return NextResponse.json({ error: "Vui lòng nhập nội dung câu hỏi." }, { status: 400 });
    }
    if (message.length > MESSAGE_MAX) {
      return NextResponse.json(
        { error: `Nội dung tối đa ${MESSAGE_MAX} ký tự.` },
        { status: 400 },
      );
    }
    if (subjectRaw.length > SUBJECT_MAX) {
      return NextResponse.json(
        { error: `Chủ đề tối đa ${SUBJECT_MAX} ký tự.` },
        { status: 400 },
      );
    }

    await assertSendRateLimit(auth.user.id, "user");

    const conversationId = await requestConsultation(
      auth.user.id,
      subjectRaw.length > 0 ? subjectRaw : null,
      message,
    );

    await publishConversationActivity(conversationId);
    return NextResponse.json({ conversationId }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "RATE_LIMITED") {
      return NextResponse.json({ error: (error as Error).message }, { status: 429 });
    }
    console.error("POST /api/mentor/conversations error:", error);
    return NextResponse.json({ error: "Không thể gửi yêu cầu tư vấn." }, { status: 500 });
  }
}
