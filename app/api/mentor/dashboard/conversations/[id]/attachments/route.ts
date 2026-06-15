import { NextResponse } from "next/server";

import { getMentorContext } from "@/lib/auth/requireMentor";
import { getConversationForMentor, uploadConversationAttachment } from "@/lib/mentor/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu tệp." }, { status: 400 });
    }

    const uploaded = await uploadConversationAttachment(id, file);
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "INVALID_ATTACHMENT") {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
    console.error("POST /api/mentor/dashboard/conversations/[id]/attachments error:", error);
    return NextResponse.json({ error: "Không thể tải tệp lên." }, { status: 500 });
  }
}
