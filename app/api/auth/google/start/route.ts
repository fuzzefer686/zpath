import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { AuthConfigError, createSignedState } from "@/lib/zpath-auth";

export const runtime = "nodejs";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_TTL_SECONDS = 10 * 60;

function sanitizeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function getSiteUrl(request: Request) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) return configuredSiteUrl.replace(/\/$/, "");

  const url = new URL(request.url);
  return url.origin;
}

export async function GET(request: Request) {
  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.json(
        { error: "Thiếu GOOGLE_OAUTH_CLIENT_ID trên server." },
        { status: 503 },
      );
    }

    const requestUrl = new URL(request.url);
    const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
    const redirectUri = `${getSiteUrl(request)}/api/auth/google/callback`;
    const state = createSignedState({
      next,
      nonce: randomBytes(16).toString("base64url"),
      exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
    });

    const googleUrl = new URL(GOOGLE_AUTH_URL);
    googleUrl.searchParams.set("client_id", clientId);
    googleUrl.searchParams.set("redirect_uri", redirectUri);
    googleUrl.searchParams.set("response_type", "code");
    googleUrl.searchParams.set("scope", "openid email profile");
    googleUrl.searchParams.set("state", state);

    return NextResponse.redirect(googleUrl);
  } catch (error) {
    console.error("Google OAuth start error:", error);
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
      { error: "Không thể bắt đầu đăng nhập Google." },
      { status: 500 },
    );
  }
}
