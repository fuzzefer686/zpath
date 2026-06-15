import "server-only";

import { supabaseServer } from "@/src/lib/db/supabaseServer";
import {
  MENTOR_PING_EVENT,
  conversationChannel,
  mentorInboxChannel,
  mentorPoolChannel,
  userInboxChannel,
} from "@/lib/mentor/channels";

type BroadcastMessage = { topic: string; event: string; payload: Record<string, unknown> };

/**
 * Server-to-client Broadcast via Supabase Realtime's HTTP endpoint (service_role).
 * Fire-and-forget: realtime is a nicety layered over polling, so failures here
 * must never break the request that triggered them.
 */
async function publishBroadcast(messages: BroadcastMessage[]): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || messages.length === 0) return;

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ messages }),
    });
  } catch (error) {
    console.error("publishBroadcast failed:", error);
  }
}

/**
 * Notify everyone who cares about a conversation that it changed: the thread
 * itself, the student's inbox, and the relevant mentor audience (shared pool
 * for anonymous, the assigned mentor's inbox for named).
 */
export async function publishConversationActivity(conversationId: string): Promise<void> {
  const { data, error } = await supabaseServer
    .from("conversations")
    .select("user_id, kind, mentor_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) return;

  const row = data as { user_id: string; kind: string; mentor_id: string | null };
  const ping = (topic: string): BroadcastMessage => ({
    topic,
    event: MENTOR_PING_EVENT,
    payload: {},
  });

  const messages: BroadcastMessage[] = [
    ping(conversationChannel(conversationId)),
    ping(userInboxChannel(row.user_id)),
  ];

  if (row.kind === "anonymous") {
    messages.push(ping(mentorPoolChannel()));
  } else if (row.mentor_id) {
    messages.push(ping(mentorInboxChannel(row.mentor_id)));
  }

  await publishBroadcast(messages);
}
