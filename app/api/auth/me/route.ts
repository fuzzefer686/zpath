import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth) {
      return NextResponse.json({ user: null, surveyCompleted: false }, { status: 401 });
    }

    return NextResponse.json(auth);
  } catch (error) {
    console.error("Auth me API error:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra phiên đăng nhập." },
      { status: 500 },
    );
  }
}
