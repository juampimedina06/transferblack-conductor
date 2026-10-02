import { transferApi } from '@/core/api/transferApi';
import {
  ApiGetMessagesResponse,
  GetMessagesResponse,
  SendMessagePayload,
  ReadMessagePayload,
} from '../interface/chat.interface';
import { mapGetMessagesResponse } from '../mapper/chat.mapper';

/**
 * Resolves the chat REST endpoint ensuring the /api prefix is always present
 * regardless of whether transferApi's baseURL has /api/v1, /api, or is the root domain.
 * Contract: /api/v1/trips/:tripId/messages
 */
const resolveChatPath = (tripId: string, subpath: string = ''): string => {
  const base = (transferApi.defaults.baseURL ?? '').replace(/\/+$/, '');
  if (base.endsWith('/api/v1')) {
    return `/trips/${tripId}/messages${subpath}`;
  }
  if (base.endsWith('/api')) {
    return `/v1/trips/${tripId}/messages${subpath}`;
  }
  return `/api/v1/trips/${tripId}/messages${subpath}`;
};

export class ChatService {
  /**
   * Fetch paginated messages for a trip.
   * `before` and `after` are mutually exclusive — never pass both.
   */
  static async getMessages(
    tripId: string,
    options: {
      limit?: number;
      before?: string | null;
      after?: string | null;
    } = {},
  ): Promise<GetMessagesResponse> {
    const { limit = 30, before, after } = options;
    const params: Record<string, string | number> = { limit };
    if (before) params.before = before;
    if (after) params.after = after;

    const endpoint = resolveChatPath(tripId);
    const response = await transferApi.get<ApiGetMessagesResponse>(
      endpoint,
      { params },
    );
    return mapGetMessagesResponse(response.data);
  }

  /**
   * Send a message. Idempotent on `client_message_id`.
   * Returns 201 (created) or 200 (already existed).
   */
  static async sendMessage(tripId: string, payload: SendMessagePayload): Promise<void> {
    const endpoint = resolveChatPath(tripId);
    await transferApi.post(endpoint, payload);
  }

  /**
   * Mark messages up to `up_to_message_id` as read.
   * Must be the id of the last message from the OTHER participant that the driver saw.
   */
  static async readMessages(tripId: string, payload: ReadMessagePayload): Promise<void> {
    const endpoint = resolveChatPath(tripId, '/read');
    await transferApi.post(endpoint, payload);
  }
}
