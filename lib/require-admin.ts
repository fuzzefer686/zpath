import { NextRequest } from "next/server";

import { getAuthenticatedUserRole, type AuthenticatedUserRole } from "@/lib/auth-server";
import { isAdminRole } from "@/lib/auth-roles";

/**
 * Returns the authenticated user when they are an admin, otherwise null.
 * Mirrors the inline guard used by /api/advisor/apply-changes so all admin-only
 * endpoints share one consistent check.
 */
export async function requireAdmin(
  req: NextRequest,
): Promise<AuthenticatedUserRole | null> {
  const auth = await getAuthenticatedUserRole(req);
  return auth && isAdminRole(auth.role) ? auth : null;
}
