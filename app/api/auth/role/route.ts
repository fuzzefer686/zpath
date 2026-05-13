import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserRole } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserRole(req);

    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    return NextResponse.json({ role: auth.role });
  } catch (error) {
    console.error("Auth role API error:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra quyền tài khoản." },
      { status: 500 },
    );
  }
}
