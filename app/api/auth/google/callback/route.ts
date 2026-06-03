import { NextResponse } from "next/server";

import {
  AuthConfigError,
  createAuthToken,
  getAuthCookieOptions,
  normalizeUsername,
  validateUsername,
  verifySignedState,
  ZPATH_AUTH_COOKIE_NAME,
  type ZpathAuthUser,
} from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

type GoogleState = {
  next?: string;
  nonce?: string;
  exp?: number;
};

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
  exp?: string;
};

type ZpathUserRow = {
  id: string;
  username: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  password_hash?: string | null;
  auth_provider?: string | null;
};

function sanitizeNextPath(value: unknown) {
  if (typeof value !== "string") return "/";
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

function redirectToLogin(request: Request, error: string) {
  const url = new URL("/login", getSiteUrl(request));
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

function toAuthUser(user: ZpathUserRow): ZpathAuthUser {
  return {
    id: String(user.id),
    username: String(user.username),
    role: user.role === "admin" ? "admin" : "user",
    email: String(user.email || ""),
    phone: String(user.phone || ""),
  };
}

function getCandidateUsername(email: string, sub: string) {
  const localPart = normalizeUsername(email.split("@")[0] ?? "");
  if (validateUsername(localPart)) return localPart;
  return `google_${sub.slice(-10).replace(/[^A-Za-z0-9]/g, "")}`;
}

async function createUniqueUsername(email: string, sub: string) {
  const baseUsername = getCandidateUsername(email, sub).slice(0, 24);

  for (let index = 0; index < 10; index += 1) {
    const candidate = index === 0 ? baseUsername : `${baseUsername}_${index}`;
    const { data, error } = await supabaseServer
      .from("zpath_users")
      .select("id")
      .eq("username_normalized", candidate.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  return `google_${sub.slice(-12)}`;
}

async function exchangeCodeForTokens({
  code,
  request,
}: {
  code: string;
  request: Request;
}) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new AuthConfigError(
      "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set.",
    );
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: `${getSiteUrl(request)}/api/auth/google/callback`,
    grant_type: "authorization_code",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.id_token) {
    throw new Error(data.error_description || data.error || "Google token exchange failed.");
  }

  return data;
}

async function verifyGoogleIdToken(idToken: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const url = new URL(TOKENINFO_URL);
  url.searchParams.set("id_token", idToken);

  const response = await fetch(url);
  const data = (await response.json()) as GoogleTokenInfo;

  if (!response.ok) {
    throw new Error("Google ID token verification failed.");
  }

  const isVerified = data.email_verified === true || data.email_verified === "true";
  const expiresAt = data.exp ? Number(data.exp) : 0;

  if (!data.sub || !data.email || !isVerified) {
    throw new Error("Google account must have a verified email.");
  }

  if (data.aud !== clientId) {
    throw new Error("Google ID token audience mismatch.");
  }

  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    throw new Error("Google ID token has expired.");
  }

  return {
    sub: data.sub,
    email: data.email.trim().toLowerCase(),
    name: data.name?.trim() || "",
    picture: data.picture?.trim() || "",
  };
}

async function upsertProfile({
  userId,
  displayName,
  avatarUrl,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string;
}) {
  const { error } = await supabaseServer.from("profiles").upsert(
    {
      id: userId,
      display_name: displayName || undefined,
      avatar_url: avatarUrl || undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const state = verifySignedState<GoogleState>(requestUrl.searchParams.get("state"));

    if (!code || !state?.exp || state.exp < Math.floor(Date.now() / 1000)) {
      return redirectToLogin(request, "google_state_invalid");
    }

    const next = sanitizeNextPath(state.next);
    const tokens = await exchangeCodeForTokens({ code, request });
    const googleUser = await verifyGoogleIdToken(String(tokens.id_token));

    const { data: byGoogleSub, error: googleLookupError } = await supabaseServer
      .from("zpath_users")
      .select("id, username, password_hash, role, email, phone, auth_provider")
      .eq("google_sub", googleUser.sub)
      .maybeSingle();

    if (googleLookupError) throw googleLookupError;

    let user = byGoogleSub as ZpathUserRow | null;

    if (!user) {
      const { data: byEmail, error: emailLookupError } = await supabaseServer
        .from("zpath_users")
        .select("id, username, password_hash, role, email, phone, auth_provider")
        .eq("email_normalized", googleUser.email)
        .maybeSingle();

      if (emailLookupError) throw emailLookupError;
      user = byEmail as ZpathUserRow | null;
    }

    if (user) {
      const { data: updatedUser, error: updateError } = await supabaseServer
        .from("zpath_users")
        .update({
          google_sub: googleUser.sub,
          google_email: googleUser.email,
          google_avatar_url: googleUser.picture || null,
        })
        .eq("id", user.id)
        .select("id, username, password_hash, role, email, phone, auth_provider")
        .single();

      if (updateError) throw updateError;
      user = updatedUser as ZpathUserRow;
    } else {
      const username = await createUniqueUsername(googleUser.email, googleUser.sub);
      const role = googleUser.email === "fuzzefer.real0@gmail.com" ? "admin" : "user";
      const { data: createdUser, error: createError } = await supabaseServer
        .from("zpath_users")
        .insert({
          username,
          email: googleUser.email,
          password_hash: null,
          role,
          phone: null,
          phone_normalized: null,
          auth_provider: "google",
          google_sub: googleUser.sub,
          google_email: googleUser.email,
          google_avatar_url: googleUser.picture || null,
        })
        .select("id, username, password_hash, role, email, phone, auth_provider")
        .single();

      if (createError) throw createError;
      user = createdUser as ZpathUserRow;
    }

    await upsertProfile({
      userId: user.id,
      displayName: googleUser.name || user.username,
      avatarUrl: googleUser.picture,
    });

    const authUser = toAuthUser(user);
    const responseUrl = new URL(
      authUser.phone
        ? next
        : `/login/complete-profile?next=${encodeURIComponent(next)}`,
      getSiteUrl(request),
    );
    const response = NextResponse.redirect(responseUrl);
    response.cookies.set(
      ZPATH_AUTH_COOKIE_NAME,
      createAuthToken(authUser),
      getAuthCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return redirectToLogin(request, "google_login_failed");
  }
}
