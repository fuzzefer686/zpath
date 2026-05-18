import { createClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error(
    "supabaseServer must only be imported from server-side code.",
  );
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY",
  );
}

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
