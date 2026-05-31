import { NextResponse } from "next/server";

import {
  AuthConfigError,
  assertAuthConfig,
  createAuthToken,
  getAuthCookieOptions,
  hashPassword,
  normalizeUsername,
  validatePassword,
  validateUsername,
  verifyPassword,
  ZPATH_AUTH_COOKIE_NAME,
} from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

type LoginBody = {
  username?: unknown;
  password?: unknown;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const username = normalizeUsername(body.username);

    if (!validateUsername(username) || !validatePassword(body.password)) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không hợp lệ." },
        { status: 400 },
      );
    }

    assertAuthConfig();

    const { data: user, error } = await supabaseServer
      .from("zpath_users")
      .select("id, username, password_hash, role, email")
      .eq("username_normalized", username.toLowerCase())
      .maybeSingle();

    if (error) throw error;

    const passwordMatches =
      user && (await verifyPassword(body.password, String(user.password_hash)));

    if (!user || !passwordMatches) {
      await hashPassword(body.password);
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng." },
        { status: 401 },
      );
    }

    const authUser = {
      id: String(user.id),
      username: String(user.username),
      role: user.role === "admin" ? "admin" as const : "user" as const,
      email: String(user.email || ""),
    };
    const token = createAuthToken(authUser);

    const { data: surveyProfile } = await supabaseServer
      .from("user_survey_profiles")
      .select("user_id")
      .eq("user_id", authUser.id)
      .maybeSingle();

    const response = NextResponse.json({
      user: authUser,
      surveyCompleted: Boolean(surveyProfile),
    });

    response.cookies.set(ZPATH_AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return response;
  } catch (error) {
    console.error("Login API error:", error);
    if (error instanceof AuthConfigError) {
      return NextResponse.json(
        {
          error:
            "Cấu hình đăng nhập chưa hợp lệ. Hãy đặt AUTH_JWT_SECRET tối thiểu 32 ký tự trên server.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Không thể đăng nhập lúc này." },
      { status: 500 },
    );
  }
}
