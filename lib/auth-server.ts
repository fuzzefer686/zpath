import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import {
  getBootstrapRoleForEmail,
  normalizeUserRole,
  type UserRole,
} from "@/lib/auth-roles";
import { createAdminClient } from "@/lib/supabase-admin";

export type AuthenticatedUserRole = {
  user: User;
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
  const token = getBearerToken(req);
  if (!token) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  const user = data.user;

  if (error || !user) return null;

  const metadata = user.app_metadata ?? {};
  const currentRole = normalizeUserRole(metadata.role);
  const bootstrapRole = getBootstrapRoleForEmail(user.email);
  const role = bootstrapRole === "admin" ? "admin" : currentRole ?? "user";

  if (metadata.role !== role) {
    await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...metadata,
        role,
      },
    });
  }

  return { user, role };
}
