import "server-only";

import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import {
  mapMentorProfile,
  type MentorContext,
  type MentorProfileRow,
} from "@/lib/mentor/types";

const MENTOR_PROFILE_COLUMNS =
  "user_id, display_name, avatar_url, show_identity_default, is_active, role, bio, created_at, updated_at";

/**
 * Resolves the current request's mentor context from the `zpath_auth` cookie.
 *
 * Returns null when the visitor is not logged in or is not an *active* mentor.
 * Callers decide how to react: server layouts redirect, API routes return 403.
 *
 * Authorization lives here (custom-auth model) — `mentor_profiles` is locked to
 * service_role, so this must run server-side via `supabaseServer`.
 */
export async function getMentorContext(): Promise<MentorContext | null> {
  const auth = await getAuthContext();
  if (!auth) return null;

  const { data, error } = await supabaseServer
    .from("mentor_profiles")
    .select(MENTOR_PROFILE_COLUMNS)
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    user: auth.user,
    profile: mapMentorProfile(data as MentorProfileRow),
  };
}
