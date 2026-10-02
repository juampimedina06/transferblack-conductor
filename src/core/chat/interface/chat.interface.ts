/**
 * Raw API shapes (snake_case / camelCase exactly as they arrive from the backend).
 * These are only used in the mapper layer — never spread into components.
 */
export type ChatSenderRole = 'passenger' | 'provider';

export interface ApiChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderRole: ChatSenderRole;
  clientMessageId: string;
  content: string;
  createdAt: string;
  deliveredAt: string | null; // always null — backend docs say to ignore it
  readAt: string | null;
}

export interface ApiGetMessagesResponse {
  data: ApiChatMessage[];
  next_cursor: string | null;
}

/** Domain message — the only shape used above the mapper layer */
export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderRole: ChatSenderRole;
  clientMessageId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  /** UI-level state — never comes from the server, managed locally */
  status: 'sending' | 'sent' | 'failed';
}

export interface GetMessagesResponse {
  data: ChatMessage[];
  next_cursor: string | null;
}

// ── REST payloads ─────────────────────────────────────────────────────────────

export interface SendMessagePayload {
  content: string;
  client_message_id: string;
}

export interface ReadMessagePayload {
  up_to_message_id: string;
}

// ── Socket event payloads ─────────────────────────────────────────────────────

/** chat.message.created — camelCase, identical to the REST response shape */
export type SocketMessageCreatedPayload = ApiChatMessage;

/** chat.message.read — snake_case per the contract */
export interface SocketMessageReadPayload {
  trip_id: string;
  up_to_message_id: string;
  read_at: string;
  reader_id: string;
}

export interface ApiChatError {
  code: string;
  message: string | string[];
}

export interface ApiChatErrorResponse {
  error: ApiChatError;
}

export interface ChatError {
  code: string;
  message: string | string[];
}
