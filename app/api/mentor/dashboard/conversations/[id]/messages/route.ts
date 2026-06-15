import { NextResponse } from "next/server";

import { getMentorContext } from "@/lib/auth/requireMentor";
import {
  assertSendRateLimit,
  getConversationForMentor,
  listMessages,
  markConversationRead,
  sendMentorMessage,
} from "@/lib/mentor/server";
import { publishConversationActivity } from "@/lib/mentor/realtime";

export const runtime = "nodejs";

const MESSAGE_MAX = 4000;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const mentor = await getMentorContext();
    if (!mentor) {
      return NextResponse.json({ error: "Không có quyền mentor." }, { status: 403 });
    }

    const { id } = await params;
    const access = await getConversationForMentor(id, mentor.user.id);
    if (!access) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const messages = await listMessages(id);
    await markConversationRead(id, "mentor", mentor.user.id);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/mentor/dashboard/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Không thể tải tin nhắn." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const mentor = await getMentorContext();
    if (!mentor) {
      return NextResponse.json({ error: "Không có quyền mentor." }, { status: 403 });
    }

    const { id } = await params;
    const access = await getConversationForMentor(id, mentor.user.id);
    if (!access) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const identityMode = body?.identity_mode === "named" ? "named" : "anonymous";
    const contentType =
      body?.content_type === "image" || body?.content_type === "file"
        ? body.content_type
        : "text";
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    const attachmentPath = typeof body?.attachment_path === "string" ? body.attachment_path : null;
    const attachmentMeta = body?.attachment_meta ?? null;

    if (contentType === "text") {
      if (text.length === 0) {
        return NextResponse.json({ error: "Tin nhắn không được để trống." }, { status: 400 });
      }
      if (text.length > MESSAGE_MAX) {
        return NextResponse.json(
          { error: `Tin nhắn tối đa ${MESSAGE_MAX} ký tự.` },
          { status: 400 },
        );
      }
    } else if (!attachmentPath) {
      return NextResponse.json({ error: "Thiếu tệp đính kèm." }, { status: 400 });
    }

    await assertSendRateLimit(mentor.user.id, "mentor");

    const result = await sendMentorMessage(
      mentor.user.id,
      id,
      identityMode,
      contentType,
      text.length > 0 ? text : null,
      attachmentPath,
      attachmentMeta,
    );
    await publishConversationActivity(result.targetConversationId);
    return NextResponse.json(
      { messageId: result.messageId, targetConversationId: result.targetConversationId },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: string })?.code === "RATE_LIMITED") {
      return NextResponse.json({ error: (error as Error).message }, { status: 429 });
    }
    console.error("POST /api/mentor/dashboard/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Không thể gửi tin nhắn." }, { status: 500 });
  }
}
