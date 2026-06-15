import { NextResponse } from "next/server";

import { getMentorContext } from "@/lib/auth/requireMentor";
import { getMentorInbox } from "@/lib/mentor/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const mentor = await getMentorContext();
    if (!mentor) {
      return NextResponse.json({ error: "Không có quyền mentor." }, { status: 403 });
    }

    const inbox = await getMentorInbox(mentor.user.id);
    return NextResponse.json(inbox);
  } catch (error) {
    console.error("GET /api/mentor/dashboard/inbox error:", error);
    return NextResponse.json({ error: "Không thể tải hộp thư." }, { status: 500 });
  }
}
