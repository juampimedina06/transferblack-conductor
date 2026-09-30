import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  StatusBar,
  Alert,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { useDriverTripStore } from '@/presentation/trip/store/useDriverTripStore';
import { useChatMessages } from '@/hooks/chat/useChatMessages';
import { useSendMessage } from '@/hooks/chat/useSendMessage';
import { useReadMessages } from '@/hooks/chat/useReadMessages';
import { useChatSocket } from '@/hooks/chat/useChatSocket';
import { mapSocketMessageToDomain, applyReadReceipt } from '@/core/chat/mapper/chat.mapper';
import {
  SocketMessageCreatedPayload,
  SocketMessageReadPayload,
  ChatMessage,
} from '@/core/chat/interface/chat.interface';
import { ChatHeader } from '../components/ChatHeader';
import { ChatMessageList } from '../components/ChatMessageList';
import { ChatInput } from '../components/ChatInput';
import { ChatQuickReplies } from '../components/ChatQuickReplies';

type BlockedReason = 'in_progress' | 'closed' | null;

const BLOCKED_STATUSES = new Set(['in_progress', 'completed', 'cancelled'] as const);

export const ChatScreen: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const activeTrip = useDriverTripStore((s) => s.activeTrip);

  // Guard: should not be here without an active trip
  useEffect(() => {
    if (!activeTrip) {
      router.replace('/(home)' as any);
    }
  }, [activeTrip]);

  if (!activeTrip || !user) return null;

  const tripId = activeTrip.id;
  const driverUserId = user.id;
  const tripStatus = activeTrip.status;
  const isTripInProgress = tripStatus === 'in_progress';

  // Derived blocked reason
  const [chatClosed, setChatClosed] = useState(false);
  const blockedReason: BlockedReason = chatClosed
    ? 'closed'
    : BLOCKED_STATUSES.has(tripStatus as any)
    ? isTripInProgress
      ? 'in_progress'
      : 'closed'
    : null;

  // ── React Query hooks ───────────────────────────────────────────────────────
  const {
    messages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    catchUp,
    upsertMessage,
    applyReadReceiptToCache,
    resetCache,
  } = useChatMessages(tripId);

  // ── Read messages ───────────────────────────────────────────────────────────
  const { markRead } = useReadMessages({
    tripId,
    driverUserId,
    isTripInProgress,
    messages,
    applyReadReceiptToCache,
  });

  // Mark read when messages change and screen is active
  useEffect(() => {
    markRead();
  }, [messages, markRead]);

  // ── Socket callbacks ────────────────────────────────────────────────────────
  const onMessageCreated = useCallback(
    (payload: SocketMessageCreatedPayload) => {
      const msg = mapSocketMessageToDomain(payload);
      upsertMessage(msg);

      // During in_progress: no toast, no scroll, no markRead
      if (!isTripInProgress) {
        markRead();
      }
    },
    [isTripInProgress, upsertMessage, markRead],
  );

  const onMessageRead = useCallback(
    (payload: SocketMessageReadPayload) => {
      applyReadReceiptToCache(payload.up_to_message_id, payload.read_at, driverUserId);
    },
    [applyReadReceiptToCache, driverUserId],
  );

  useChatSocket({
    tripId,
    onMessageCreated,
    onMessageRead,
    onReconnect: catchUp,
  });

  // ── Send ────────────────────────────────────────────────────────────────────
  const { sendMessage, retryMessage } = useSendMessage({
    tripId,
    driverUserId,
    isTripInProgress,
    upsertMessage,
    onChatClosed: () => setChatClosed(true),
    onForbidden: () => {
      Alert.alert('Sin acceso', 'No tenés permiso para enviar mensajes en este viaje.', [
        { text: 'Volver', onPress: () => router.back() },
      ]);
    },
    onError: (text) => {
      Alert.alert('No se pudo enviar', text);
    },
  });

  const handleRetry = useCallback(
    (msg: ChatMessage) => retryMessage(msg),
    [retryMessage],
  );

  const handleSend = useCallback(
    (text: string) => sendMessage(text),
    [sendMessage],
  );

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0C]" edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0C" />

      <ChatHeader trip={activeTrip} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ChatMessageList
          messages={messages}
          driverUserId={driverUserId}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={!!hasNextPage}
          onLoadMore={handleLoadMore}
          onRetry={handleRetry}
        />

        <ChatQuickReplies
          disabled={blockedReason !== null}
          onSelect={handleSend}
        />

        <ChatInput
          blockedReason={blockedReason}
          onSend={handleSend}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
