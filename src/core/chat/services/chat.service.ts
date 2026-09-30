import { transferApi } from '@/core/api/transferApi';
import {
  ApiGetMessagesResponse,
  GetMessagesResponse,
  SendMessagePayload,
  ReadMessagePayload,
} from '../interface/chat.interface';
import { mapGetMessagesResponse } from '../mapper/chat.mapper';

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

    const response = await transferApi.get<ApiGetMessagesResponse>(
      `/v1/trips/${tripId}/messages`,
      { params },
    );
    return mapGetMessagesResponse(response.data);
  }

  /**
   * Send a message. Idempotent on `client_message_id`.
   * Returns 201 (created) or 200 (already existed).
   */
  static async sendMessage(tripId: string, payload: SendMessagePayload): Promise<void> {
    await transferApi.post(`/v1/trips/${tripId}/messages`, payload);
  }

  /**
   * Mark messages up to `up_to_message_id` as read.
   * Must be the id of the last message from the OTHER participant that the driver saw.
   */
  static async readMessages(tripId: string, payload: ReadMessagePayload): Promise<void> {
    await transferApi.post(`/v1/trips/${tripId}/messages/read`, payload);
  }
}
