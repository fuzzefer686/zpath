import { NextResponse } from "next/server";

import { getMentorContext } from "@/lib/auth/requireMentor";
import { claimConversation, getConversationForMentor } from "@/lib/mentor/server";
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

    const namedConversationId = await claimConversation(mentor.user.id, id);
    await publishConversationActivity(namedConversationId);
    return NextResponse.json({ namedConversationId });
  } catch (error) {
    console.error("POST /api/mentor/dashboard/conversations/[id]/claim error:", error);
    return NextResponse.json({ error: "Không thể nhận cuộc trò chuyện." }, { status: 500 });
  }
}
