import { useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { ChatService } from '@/core/chat/services/chat.service';
import { GetMessagesResponse, ChatMessage } from '@/core/chat/interface/chat.interface';
import { mergeMessages } from '@/core/chat/mapper/chat.mapper';

export const chatMessagesKey = (tripId: string) => ['chat', 'messages', tripId] as const;

export type ChatMessagesPage = GetMessagesResponse;
export type ChatInfiniteData = InfiniteData<ChatMessagesPage>;

/**
 * Infinite query for chat history.
 *
 * - Pages ordered: newest first (matches backend DESC order).
 * - `before` cursor = load older pages (onEndReached scrolling up).
 * - `after` id = catch-up on reconnect/foreground.
 */
export const useChatMessages = (tripId: string) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<ChatMessagesPage, Error>({
    queryKey: chatMessagesKey(tripId),
    queryFn: async ({ pageParam }) => {
      return ChatService.getMessages(tripId, {
        limit: 30,
        before: pageParam as string | null | undefined,
      });
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  /** All messages flat, deduplicated and strictly sorted newest-first */
  const allMessages = useMemo<ChatMessage[]>(() => {
    if (!query.data) return [];
    const flat = query.data.pages.flatMap((p) => p.data);
    const merged = mergeMessages([], flat);
    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [query.data]);

  /**
   * Called after socket reconnect or foreground:
   * fetches messages newer than the last confirmed one and merges them.
   */
  const catchUp = useCallback(async () => {
    if (!allMessages.length) {
      await query.refetch();
      return;
    }
    // Find the last confirmed (non-optimistic) message
    const lastConfirmed = [...allMessages].find((m) => m.status === 'sent');
    if (!lastConfirmed) {
      await query.refetch();
      return;
    }

    try {
      const fresh = await ChatService.getMessages(tripId, { after: lastConfirmed.id });
      if (!fresh.data.length) return;

      queryClient.setQueryData<ChatInfiniteData>(chatMessagesKey(tripId), (old) => {
        if (!old) return old;
        const [firstPage, ...rest] = old.pages;
        const merged = mergeMessages(firstPage.data, fresh.data);
        merged.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        return {
          ...old,
          pages: [{ ...firstPage, data: merged }, ...rest],
        };
      });
    } catch {
      // Catch-up failures are silent — the user didn't trigger this
    }
  }, [allMessages, tripId, queryClient, query]);

  /**
   * Insert or update a single message in the first cache page.
   * Used for optimistic inserts and reconciliation.
   */
  const upsertMessage = useCallback(
    (msg: ChatMessage) => {
      queryClient.setQueryData<ChatInfiniteData>(chatMessagesKey(tripId), (old) => {
        if (!old) {
          return {
            pages: [{ data: [msg], next_cursor: null }],
            pageParams: [null],
          };
        }
        const [firstPage, ...rest] = old.pages;
        const merged = mergeMessages(firstPage.data, [msg]);
        // Keep newest-first order
        merged.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        return {
          ...old,
          pages: [{ ...firstPage, data: merged }, ...rest],
        };
      });
    },
    [tripId, queryClient],
  );

  /**
   * Update `readAt` for driver's own messages up to `upToMessageId`.
   */
  const applyReadReceiptToCache = useCallback(
    (upToMessageId: string, readAt: string, driverUserId: string) => {
      queryClient.setQueryData<ChatInfiniteData>(chatMessagesKey(tripId), (old) => {
        if (!old) return old;
        const targetIdx = old.pages[0]?.data.findIndex((m) => m.id === upToMessageId);
        const targetDate =
          targetIdx !== undefined && targetIdx !== -1
            ? old.pages[0].data[targetIdx].createdAt
            : null;
        if (!targetDate) return old;

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((m) =>
              m.senderId === driverUserId &&
              m.readAt === null &&
              m.createdAt <= targetDate
                ? { ...m, readAt }
                : m,
            ),
          })),
        };
      });
    },
    [tripId, queryClient],
  );

  /**
   * Mark CURSOR_NOT_FOUND: discard cache and reload from scratch.
   */
  const resetCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: chatMessagesKey(tripId) });
  }, [tripId, queryClient]);

  return {
    messages: allMessages,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    catchUp,
    upsertMessage,
    applyReadReceiptToCache,
    resetCache,
  };
};
