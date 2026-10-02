import {
  ApiChatMessage,
  ApiGetMessagesResponse,
  ChatMessage,
  GetMessagesResponse,
  SocketMessageCreatedPayload,
} from '../interface/chat.interface';

/** Map a raw API message to a domain ChatMessage */
export const mapApiMessageToDomain = (raw: ApiChatMessage | any): ChatMessage => {
  const roleRaw = raw.senderRole ?? raw.sender_role;
  const senderRole = roleRaw === 'driver' ? 'provider' : (roleRaw as 'passenger' | 'provider');

  return {
    id: raw.id,
    tripId: raw.tripId ?? raw.trip_id,
    senderId: raw.senderId ?? raw.sender_id,
    senderRole,
    clientMessageId: raw.clientMessageId ?? raw.client_message_id,
    content: raw.content,
    createdAt: raw.createdAt ?? raw.created_at,
    readAt: raw.readAt ?? raw.read_at ?? null,
    status: 'sent',
  };
};

/** Map a socket chat.message.created payload to domain (same shape as ApiChatMessage) */
export const mapSocketMessageToDomain = (payload: SocketMessageCreatedPayload): ChatMessage =>
  mapApiMessageToDomain(payload);

/** Map full paginated response */
export const mapGetMessagesResponse = (raw: ApiGetMessagesResponse): GetMessagesResponse => ({
  data: raw.data.map(mapApiMessageToDomain),
  next_cursor: raw.next_cursor,
});

// ── Role label map ────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  passenger: 'Pasajero',
  provider: 'Conductor',
  requester: 'Coordinación',
};

export const getRoleLabel = (role: string): string =>
  ROLE_LABEL[role] ?? 'Interlocutor';

// ── Merge / deduplication helpers ─────────────────────────────────────────────

/**
 * Merge two message lists, deduplicating by `id` and `clientMessageId`.
 * Optimistic messages (no `id`) are identified solely by `clientMessageId`.
 * When a confirmed message arrives, it replaces its matching optimistic one.
 */
export const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
  const byId = new Map<string, ChatMessage>();
  const byClientId = new Map<string, ChatMessage>();

  const add = (msg: ChatMessage) => {
    // Replace optimistic entry if this is the confirmed version
    if (msg.clientMessageId) {
      const optimistic = byClientId.get(msg.clientMessageId);
      if (optimistic && optimistic.id !== msg.id) {
        byId.delete(optimistic.id);
      }
      byClientId.set(msg.clientMessageId, msg);
    }
    if (msg.id) {
      byId.set(msg.id, msg);
    }
  };

  for (const msg of existing) add(msg);
  for (const msg of incoming) {
    const existingConfirmed = msg.id ? byId.get(msg.id) : undefined;
    if (existingConfirmed) {
      // Already confirmed — keep the one with more read info
      if (msg.readAt && !existingConfirmed.readAt) {
        add(msg);
      }
      continue;
    }
    add(msg);
  }

  return Array.from(byId.values());
};

/**
 * After receiving chat.message.read, update readAt for all messages from
 * the sender that were sent before or at `upToMessageId`.
 */
export const applyReadReceipt = (
  messages: ChatMessage[],
  upToMessageId: string,
  readAt: string,
  driverUserId: string,
): ChatMessage[] => {
  const targetIdx = messages.findIndex((m) => m.id === upToMessageId);
  if (targetIdx === -1) return messages;

  const targetCreatedAt = messages[targetIdx].createdAt;

  return messages.map((m) => {
    if (
      m.senderId === driverUserId &&
      m.readAt === null &&
      m.createdAt <= targetCreatedAt
    ) {
      return { ...m, readAt };
    }
    return m;
  });
};

// ── Post-trip grace window helpers ──────────────────────────────────────────

export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export type ChatBlockedReason = 'in_progress' | 'closed' | null;

/**
 * Checks whether the post-trip chat has expired.
 * The chat closes strictly 24 hours after the trip is completed (finishedAt) or cancelled (cancelledAt).
 * Subsequent trip updates (e.g. updated_at) do NOT extend the open window.
 */
export const isPostTripChatExpired = (trip: {
  status: string;
  finished_at?: string | null;
  cancelled_at?: string | null;
  finishedAt?: string | null;
  cancelledAt?: string | null;
}): boolean => {
  const isEnded = trip.status === 'completed' || trip.status === 'cancelled';
  if (!isEnded) return false;

  const rawTimestamp =
    trip.finished_at ||
    trip.finishedAt ||
    trip.cancelled_at ||
    trip.cancelledAt;

  if (!rawTimestamp) {
    return true;
  }

  const endTime = new Date(rawTimestamp).getTime();
  if (isNaN(endTime)) return true;

  return Date.now() - endTime > TWENTY_FOUR_HOURS_MS;
};

/**
 * Computes the blocked reason for the chat.
 */
export const getChatBlockedReason = (
  trip: {
    status: string;
    finished_at?: string | null;
    cancelled_at?: string | null;
    finishedAt?: string | null;
    cancelledAt?: string | null;
  },
  chatClosedExplicitly: boolean = false,
): ChatBlockedReason => {
  if (chatClosedExplicitly) return 'closed';
  if (trip.status === 'in_progress') return 'in_progress';
  if (isPostTripChatExpired(trip)) return 'closed';
  return null;
};
