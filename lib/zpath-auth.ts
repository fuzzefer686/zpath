import "server-only";

import { randomBytes, scrypt, timingSafeEqual, createHmac } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";

import { supabaseServer } from "@/src/lib/db/supabaseServer";

export type ZpathUserRole = "admin" | "user";

export type ZpathAuthUser = {
  id: string;
  username: string;
  role: ZpathUserRole;
  email: string;
};

export type ZpathAuthContext = {
  user: ZpathAuthUser;
  surveyCompleted: boolean;
};

type JwtPayload = {
  sub: string;
  username: string;
  role: ZpathUserRole;
  email: string;
  exp: number;
};

const scryptAsync = promisify(scrypt);
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export const ZPATH_AUTH_COOKIE_NAME = "zpath_auth";

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set to at least 32 characters.");
  }

  return secret;
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value: unknown) {
  return base64UrlEncode(JSON.stringify(value));
}

function signValue(value: string) {
  return createHmac("sha256", getJwtSecret()).update(value).digest("base64url");
}

export function normalizeUsername(username: unknown) {
  return typeof username === "string" ? username.trim() : "";
}

export function validateUsername(username: string) {
  return /^[A-Za-z0-9_.-]{3,32}$/.test(username);
}

export function validateEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 8;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(hash, "base64url");

  if (derivedKey.length !== storedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

export function createAuthToken(user: ZpathAuthUser) {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlJson({
    sub: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  } satisfies JwtPayload);
  const body = `${header}.${payload}`;

  return `${body}.${signValue(body)}`;
}

export function verifyAuthToken(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = signValue(`${header}.${payload}`);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as JwtPayload;
    const isValidRole = parsed.role === "admin" || parsed.role === "user";

    if (!parsed.sub || !parsed.username || !parsed.email || !isValidRole) return null;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  };
}

export async function getAuthContextFromToken(
  token: string | null | undefined,
): Promise<ZpathAuthContext | null> {
  if (!token) return null;

  const payload = verifyAuthToken(token);
  if (!payload) return null;

  const { data: user, error } = await supabaseServer
    .from("zpath_users")
    .select("id, username, role, email")
    .eq("id", payload.sub)
    .maybeSingle();

  if (error || !user) return null;

  const { data: surveyProfile } = await supabaseServer
    .from("user_survey_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user: {
      id: String(user.id),
      username: String(user.username),
      role: user.role === "admin" ? "admin" : "user",
      email: String(user.email || ""),
    },
    surveyCompleted: Boolean(surveyProfile),
  };
}

export async function getAuthContext(): Promise<ZpathAuthContext | null> {
  const cookieStore = await cookies();
  return getAuthContextFromToken(cookieStore.get(ZPATH_AUTH_COOKIE_NAME)?.value);
}
