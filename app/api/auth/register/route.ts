import { NextResponse } from "next/server";

import {
  createAuthToken,
  getAuthCookieOptions,
  hashPassword,
  normalizeUsername,
  validatePassword,
  validateUsername,
  ZPATH_AUTH_COOKIE_NAME,
} from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

type RegisterBody = {
  username?: unknown;
  password?: unknown;
};

type PostgresError = {
  code?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const username = normalizeUsername(body.username);

    if (!validateUsername(username)) {
      return NextResponse.json(
        {
          error:
            "Tên đăng nhập phải có 3-32 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.",
        },
        { status: 400 },
      );
    }

    if (!validatePassword(body.password)) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 8 ký tự." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(body.password);
    const { data: user, error } = await supabaseServer
      .from("zpath_users")
      .insert({
        username,
        password_hash: passwordHash,
      })
      .select("id, username, role")
      .single();

    if (error) {
      if ((error as PostgresError).code === "23505") {
        return NextResponse.json(
          { error: "Tên đăng nhập đã tồn tại." },
          { status: 409 },
        );
      }

      throw error;
    }

    const authUser = {
      id: String(user.id),
      username: String(user.username),
      role: user.role === "admin" ? "admin" as const : "user" as const,
    };
    const token = createAuthToken(authUser);
    const response = NextResponse.json({
      user: authUser,
      surveyCompleted: false,
    });

    response.cookies.set(ZPATH_AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return response;
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Không thể tạo tài khoản lúc này." },
      { status: 500 },
    );
  }
}
