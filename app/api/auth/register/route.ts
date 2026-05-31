import { NextResponse } from "next/server";

import {
  createAuthToken,
  getAuthCookieOptions,
  hashPassword,
  normalizeUsername,
  validatePassword,
  validateUsername,
  validateEmail,
  ZPATH_AUTH_COOKIE_NAME,
} from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

type RegisterBody = {
  username?: unknown;
  email?: unknown;
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

    if (!validateEmail(body.email)) {
      return NextResponse.json(
        { error: "Địa chỉ email không hợp lệ." },
        { status: 400 },
      );
    }

    if (!validatePassword(body.password)) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 8 ký tự." },
        { status: 400 },
      );
    }

    const email = String(body.email).trim().toLowerCase();
    const role = email === "fuzzefer.real0@gmail.com" ? "admin" : "user";
    const passwordHash = await hashPassword(body.password);

    const { data: user, error } = await supabaseServer
      .from("zpath_users")
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role,
      })
      .select("id, username, role, email")
      .single();

    if (error) {
      if ((error as PostgresError).code === "23505") {
        return NextResponse.json(
          { error: "Tên đăng nhập hoặc địa chỉ email đã được sử dụng." },
          { status: 409 },
        );
      }

      throw error;
    }

    // Auto-create user profile in profiles table
    try {
      await supabaseServer.from("profiles").insert({
        id: user.id,
        display_name: username,
      });
    } catch (profileErr) {
      console.error("Failed to create user profile during registration:", profileErr);
      // Don't fail the whole registration if profile creation fails for some reason
    }

    const authUser = {
      id: String(user.id),
      username: String(user.username),
      role: user.role === "admin" ? "admin" as const : "user" as const,
      email: String(user.email || ""),
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
