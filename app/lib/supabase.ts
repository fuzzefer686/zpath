import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchWithSupabaseTimeout } from "@/lib/supabase-fetch";

const missingSupabaseConfigMessage =
  "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables";

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    throw new Error(missingSupabaseConfigMessage);
  }

  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: fetchWithSupabaseTimeout,
        },
      },
    );
  }

  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = Reflect.get(getSupabaseClient(), prop);
    return typeof value === "function" ? value.bind(getSupabaseClient()) : value;
  },
});
