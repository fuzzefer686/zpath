import { NextRequest } from "next/server";

import type { UserRole } from "@/lib/auth-roles";
import { getAuthContextFromToken, type ZpathAuthUser } from "@/lib/zpath-auth";

export type AuthenticatedUserRole = {
  user: ZpathAuthUser;
  role: UserRole;
};

export function getBearerToken(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

export async function getAuthenticatedUserRole(
  req: NextRequest,
): Promise<AuthenticatedUserRole | null> {
  const token = getBearerToken(req) ?? req.cookies.get("zpath_auth")?.value;
  if (!token) return null;

  const auth = await getAuthContextFromToken(token);
  return auth ? { user: auth.user, role: auth.user.role } : null;
}
