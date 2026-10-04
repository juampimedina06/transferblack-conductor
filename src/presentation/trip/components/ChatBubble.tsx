import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '@/core/chat/interface/chat.interface';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onRetry?: (msg: ChatMessage) => void;
}

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const StatusTick = ({
  status,
  readAt,
}: {
  status: ChatMessage['status'];
  readAt: string | null;
}) => {
  if (status === 'sending') {
    return <Ionicons name="time-outline" size={12} color="rgba(0,0,0,0.5)" />;
  }
  if (status === 'failed') {
    return <Ionicons name="alert-circle" size={13} color="#EF4444" />;
  }
  // sent
  const color = readAt ? '#0284C7' : 'rgba(0,0,0,0.5)';
  return (
    <View className="flex-row">
      <Ionicons name="checkmark" size={13} color={color} style={{ marginRight: -6 }} />
      <Ionicons name="checkmark" size={13} color={color} />
    </View>
  );
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwn, onRetry }) => {
  const bubbleBase = 'max-w-[82%] px-3.5 pt-2.5 pb-1.5 rounded-2xl shadow-sm';
  const ownStyle = `${bubbleBase} bg-gold rounded-br-sm self-end`;
  const otherStyle = `${bubbleBase} bg-charcoal border border-white/10 rounded-bl-sm self-start`;

  return (
    <View className={`mb-1.5 ${isOwn ? 'items-end px-3' : 'items-start px-3'}`}>
      <View className={isOwn ? ownStyle : otherStyle}>
        <Text
          className={`text-[15px] font-montserrat leading-[22px] ${
            isOwn ? 'text-obsidian font-montserrat-medium' : 'text-white'
          }`}
        >
          {message.content}
        </Text>

        <View className="flex-row items-center justify-end mt-1 gap-1">
          <Text
            className={`text-[10px] font-montserrat ${
              isOwn ? 'text-obsidian/60' : 'text-ash'
            }`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatTime(message.createdAt)}
          </Text>

          {isOwn && (
            <StatusTick status={message.status} readAt={message.readAt} />
          )}

          {isOwn && message.status === 'failed' && onRetry && (
            <TouchableOpacity
              onPress={() => onRetry(message)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Reintentar envío"
              accessibilityRole="button"
            >
              <Text className="text-red-500 font-montserrat-semibold text-[11px] ml-1">Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

