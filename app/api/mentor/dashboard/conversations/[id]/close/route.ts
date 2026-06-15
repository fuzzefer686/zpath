import { NextResponse } from "next/server";

import { getMentorContext } from "@/lib/auth/requireMentor";
import { closeConversationAsMentor, getConversationForMentor } from "@/lib/mentor/server";
import { publishConversationActivity } from "@/lib/mentor/realtime";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
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

    await closeConversationAsMentor(id);
    await publishConversationActivity(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/mentor/dashboard/conversations/[id]/close error:", error);
    return NextResponse.json({ error: "Không thể đóng cuộc trò chuyện." }, { status: 500 });
  }
}
