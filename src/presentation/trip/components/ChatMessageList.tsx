import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  Text,
  ListRenderItemInfo,
} from 'react-native';
import { ChatMessage } from '@/core/chat/interface/chat.interface';
import { ChatBubble } from './ChatBubble';
import { ChatEmptyState } from './ChatEmptyState';

interface ChatMessageListProps {
  messages: ChatMessage[];
  driverUserId: string;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onRetry: (msg: ChatMessage) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  driverUserId,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  onRetry,
}) => {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => (
      <ChatBubble
        message={item}
        isOwn={item.senderId === driverUserId}
        onRetry={onRetry}
      />
    ),
    [driverUserId, onRetry],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.clientMessageId || item.id, []);

  const ListFooter = useCallback(() => {
    if (!isFetchingNextPage) return <View className="h-3" />;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#D4AF37" />
      </View>
    );
  }, [isFetchingNextPage]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <FlatList
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      inverted
      // Newest messages at the bottom without manual scrollToEnd
      contentContainerStyle={{ flexGrow: 1, paddingTop: 12 }}
      ListEmptyComponent={<ChatEmptyState />}
      ListFooterComponent={<ListFooter />}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      }}
      onEndReachedThreshold={0.3}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      // Performance
      removeClippedSubviews
      maxToRenderPerBatch={15}
      windowSize={10}
    />
  );
};
