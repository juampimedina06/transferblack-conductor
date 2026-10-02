import { useCallback, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import { ChatService } from '@/core/chat/services/chat.service';
import { ChatMessage } from '@/core/chat/interface/chat.interface';
import { extractChatError, getChatErrorText } from '@/core/chat/errors/chat.errors';

interface UseSendMessageProps {
  tripId: string;
  driverUserId: string;
  isTripInProgress: boolean;
  upsertMessage: (msg: ChatMessage) => void;
  onRateLimit?: (retryAfterSeconds: number) => void;
  onChatClosed?: () => void;
  onForbidden?: () => void;
  onError?: (text: string) => void;
}

export const useSendMessage = ({
  tripId,
  driverUserId,
  isTripInProgress,
  upsertMessage,
  onRateLimit,
  onChatClosed,
  onForbidden,
  onError,
}: UseSendMessageProps) => {
  // Tracks in-flight clientMessageIds to prevent double-submits
  const inFlightRef = useRef<Set<string>>(new Set());

  const sendMessage = useCallback(
    async (content: string, existingClientMessageId?: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const clientMessageId = existingClientMessageId ?? Crypto.randomUUID();

      if (inFlightRef.current.has(clientMessageId)) return;
      inFlightRef.current.add(clientMessageId);

      // Optimistic insert with 'provider' role (driver)
      const optimistic: ChatMessage = {
        id: clientMessageId, // temporary — will be replaced on server confirm
        tripId,
        senderId: driverUserId,
        senderRole: 'provider',
        clientMessageId,
        content: trimmed,
        createdAt: new Date().toISOString(),
        readAt: null,
        status: 'sending',
      };
      upsertMessage(optimistic);

      try {
        await ChatService.sendMessage(tripId, {
          content: trimmed,
          client_message_id: clientMessageId,
        });
        // Socket chat.message.created will reconcile the real id + status='sent'.
        // If the socket event arrives first it's fine — upsertMessage dedupes.
        // Mark local as 'sent' now so there's no lag if socket is slow.
        upsertMessage({ ...optimistic, status: 'sent' });
      } catch (err: any) {
        inFlightRef.current.delete(clientMessageId);

        const status = err?.response?.status as number | undefined;
        const { code, message: serverMessage } = extractChatError(err);

        if (status === 409 && code === 'CHAT_CLOSED') {
          upsertMessage({ ...optimistic, status: 'failed' });
          onChatClosed?.();
          return;
        }

        if (status === 403) {
          upsertMessage({ ...optimistic, status: 'failed' });
          onForbidden?.();
          return;
        }

        if (status === 429) {
          upsertMessage({ ...optimistic, status: 'failed' });
          const retryAfter = parseInt(err?.response?.headers?.['retry-after'] ?? '5', 10);
          onRateLimit?.(retryAfter);
          onError?.(getChatErrorText('RATE_LIMIT_EXCEEDED', isTripInProgress));
          return;
        }

        // Network / 5xx → failed, user can retry
        upsertMessage({ ...optimistic, status: 'failed' });
        onError?.(getChatErrorText(code, isTripInProgress, serverMessage));
      } finally {
        inFlightRef.current.delete(clientMessageId);
      }
    },
    [tripId, driverUserId, isTripInProgress, upsertMessage, onRateLimit, onChatClosed, onForbidden, onError],
  );

  /** Retry a failed message using the same clientMessageId (idempotent on the backend) */
  const retryMessage = useCallback(
    (msg: ChatMessage) => sendMessage(msg.content, msg.clientMessageId),
    [sendMessage],
  );

  return { sendMessage, retryMessage };
};
