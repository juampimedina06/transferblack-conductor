import { useCallback, useEffect, useRef } from 'react';
import { ChatService } from '@/core/chat/services/chat.service';
import { ChatMessage } from '@/core/chat/interface/chat.interface';

interface UseReadMessagesProps {
  tripId: string;
  driverUserId: string;
  isTripInProgress: boolean;
  messages: ChatMessage[];
  applyReadReceiptToCache: (upToMessageId: string, readAt: string, driverUserId: string) => void;
}

const DEBOUNCE_MS = 500;

/**
 * Marks messages from the other participant as read.
 *
 * Rules:
 * - Never fires during `in_progress` (road safety).
 * - Debounced 500ms.
 * - Idempotent: only POSTs if the last-seen message changed.
 */
export const useReadMessages = ({
  tripId,
  driverUserId,
  isTripInProgress,
  messages,
}: UseReadMessagesProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const markRead = useCallback(() => {
    if (isTripInProgress) return;

    // Find the latest message from the other participant
    const candidate = messages.find((m) => m.senderId !== driverUserId && m.status === 'sent');
    if (!candidate) return;
    if (candidate.id === lastSentRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      lastSentRef.current = candidate.id;
      try {
        await ChatService.readMessages(tripId, { up_to_message_id: candidate.id });
      } catch {
        // Silent — read receipts are best-effort
      }
    }, DEBOUNCE_MS);
  }, [tripId, driverUserId, isTripInProgress, messages]);

  return { markRead };
};
