import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import {
  assertSendRateLimit,
  getConversationOwner,
  listMessages,
  markConversationRead,
  sendUserMessage,
} from "@/lib/mentor/server";
import { publishConversationActivity } from "@/lib/mentor/realtime";

export const runtime = "nodejs";

const MESSAGE_MAX = 4000;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { id } = await params;
    const owner = await getConversationOwner(id);
    if (!owner) {
      return NextResponse.json({ error: "Không tìm thấy cuộc trò chuyện." }, { status: 404 });
    }
    if (owner !== auth.user.id) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const messages = await listMessages(id);
    // Opening a thread clears the user's unread counter.
    await markConversationRead(id, "user", auth.user.id);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/mentor/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Không thể tải tin nhắn." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const { id } = await params;
    const owner = await getConversationOwner(id);
    if (!owner) {
      return NextResponse.json({ error: "Không tìm thấy cuộc trò chuyện." }, { status: 404 });
    }
    if (owner !== auth.user.id) {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
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

    await assertSendRateLimit(auth.user.id, "user");

    const messageId = await sendUserMessage(
      auth.user.id,
      id,
      contentType,
      text.length > 0 ? text : null,
      attachmentPath,
      attachmentMeta,
    );
    await publishConversationActivity(id);
    return NextResponse.json({ messageId }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "RATE_LIMITED") {
      return NextResponse.json({ error: (error as Error).message }, { status: 429 });
    }
    console.error("POST /api/mentor/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Không thể gửi tin nhắn." }, { status: 500 });
  }
}
