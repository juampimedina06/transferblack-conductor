import {
  ApiChatMessage,
  ApiGetMessagesResponse,
  ChatMessage,
  GetMessagesResponse,
  SocketMessageCreatedPayload,
} from '../interface/chat.interface';

/** Map a raw API message to a domain ChatMessage */
export const mapApiMessageToDomain = (raw: ApiChatMessage): ChatMessage => ({
  id: raw.id,
  tripId: raw.tripId,
  senderId: raw.senderId,
  senderRole: raw.senderRole,
  clientMessageId: raw.clientMessageId,
  content: raw.content,
  createdAt: raw.createdAt,
  readAt: raw.readAt,
  status: 'sent',
});

/** Map a socket chat.message.created payload to domain (same shape as ApiChatMessage) */
export const mapSocketMessageToDomain = (payload: SocketMessageCreatedPayload): ChatMessage =>
  mapApiMessageToDomain(payload);

/** Map full paginated response */
export const mapGetMessagesResponse = (raw: ApiGetMessagesResponse): GetMessagesResponse => ({
  data: raw.data.map(mapApiMessageToDomain),
  next_cursor: raw.next_cursor,
});

// ── Role label map ────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<'passenger' | 'requester', string> = {
  passenger: 'Pasajero',
  requester: 'Coordinación',
};

export const getRoleLabel = (role: 'passenger' | 'requester'): string =>
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
    const optimistic = byClientId.get(msg.clientMessageId);
    if (optimistic) {
      byId.delete(optimistic.id);
    }
    byId.set(msg.id, msg);
    byClientId.set(msg.clientMessageId, msg);
  };

  for (const msg of existing) add(msg);
  for (const msg of incoming) {
    const existingConfirmed = byId.get(msg.id);
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
