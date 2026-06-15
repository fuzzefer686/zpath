"use client";

import { getSupabaseClient } from "@/app/lib/supabase";
import { MENTOR_PING_EVENT } from "@/lib/mentor/channels";

/**
 * Subscribe to a public Broadcast channel and run `onPing` on each ping.
 * Returns an unsubscribe function. Safe no-op if Supabase config is missing.
 *
 * Pings carry no payload — the caller refetches via authenticated APIs.
 */
export function subscribeToPing(channelName: string, onPing: () => void): () => void {
  let cleanup = () => {};

  try {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: MENTOR_PING_EVENT }, () => onPing())
      .subscribe();

    cleanup = () => {
      supabase.removeChannel(channel);
    };
  } catch {
    // Realtime unavailable (e.g. missing env) — polling remains the fallback.
  }

  return cleanup;
}
