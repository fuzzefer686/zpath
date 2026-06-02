import { NextResponse } from "next/server";

import {
  createAuthToken,
  getAuthContext,
  getAuthCookieOptions,
  normalizePhone,
  normalizePhoneForStorage,
  validatePhone,
  ZPATH_AUTH_COOKIE_NAME,
} from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

type CompleteProfileBody = {
  phone?: unknown;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const body = (await request.json()) as CompleteProfileBody;
    if (!validatePhone(body.phone)) {
      return NextResponse.json(
        { error: "Số điện thoại không hợp lệ. Hãy nhập tối thiểu 9 chữ số." },
        { status: 400 },
      );
    }

    const phone = normalizePhone(body.phone);
    const phoneNormalized = normalizePhoneForStorage(phone);
    const { data: user, error } = await supabaseServer
      .from("zpath_users")
      .update({
        phone,
        phone_normalized: phoneNormalized,
      })
      .eq("id", auth.user.id)
      .select("id, username, role, email, phone")
      .single();

    if (error) throw error;

    const authUser = {
      id: String(user.id),
      username: String(user.username),
      role: user.role === "admin" ? "admin" as const : "user" as const,
      email: String(user.email || ""),
      phone: String(user.phone || ""),
    };

    const response = NextResponse.json({
      user: authUser,
      surveyCompleted: auth.surveyCompleted,
    });
    response.cookies.set(
      ZPATH_AUTH_COOKIE_NAME,
      createAuthToken(authUser),
      getAuthCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error("Complete profile API error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật số điện thoại lúc này." },
      { status: 500 },
    );
  }
}
