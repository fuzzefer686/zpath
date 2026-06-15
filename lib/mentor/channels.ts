// Realtime Broadcast channel names + event, shared by client and server.
// Payloads are intentionally empty "pings": clients refetch via authenticated
// APIs on receipt, so a public channel never carries message content.

export const MENTOR_PING_EVENT = "ping";

/** Per-thread channel: subscribers refetch that thread's messages. */
export const conversationChannel = (conversationId: string) =>
  `mentor-conv-${conversationId}`;

/** A user's inbox channel: refetch their conversation list. */
export const userInboxChannel = (userId: string) => `mentor-user-${userId}`;

/** Shared anonymous pool channel: every mentor refetches the pool. */
export const mentorPoolChannel = () => "mentor-pool";

/** A specific mentor's named-thread inbox channel. */
export const mentorInboxChannel = (mentorId: string) => `mentor-inbox-${mentorId}`;
