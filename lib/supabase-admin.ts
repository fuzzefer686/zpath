import { createClient } from "@supabase/supabase-js";
import { fetchWithSupabaseTimeout } from "@/lib/supabase-fetch";

/**
 * Server-only Supabase client using service_role key.
 * NEVER import this in client-side code!
 * Used for admin operations like setting app_metadata, managing users, etc.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithSupabaseTimeout,
    },
  });
}
