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
    return <Ionicons name="time-outline" size={12} color="rgba(0,0,0,0.4)" />;
  }
  if (status === 'failed') {
    return <Ionicons name="alert-circle-outline" size={13} color="#FF3B30" />;
  }
  // sent
  const color = readAt ? '#0A5FA0' : 'rgba(0,0,0,0.4)';
  return (
    <View className="flex-row">
      <Ionicons name="checkmark" size={13} color={color} style={{ marginRight: -6 }} />
      <Ionicons name="checkmark" size={13} color={color} />
    </View>
  );
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwn, onRetry }) => {
  const bubbleBase = 'max-w-[78%] px-3 pt-2 pb-1 rounded-2xl';
  const ownStyle = `${bubbleBase} bg-[#D4AF37] rounded-br-sm self-end`;
  const otherStyle = `${bubbleBase} bg-[#2C2C2E] rounded-bl-sm self-start`;

  return (
    <View className={`mb-1 ${isOwn ? 'items-end px-3' : 'items-start px-3'}`}>
      <View className={isOwn ? ownStyle : otherStyle}>
        <Text
          className={`text-[15px] leading-[21px] ${
            isOwn ? 'text-[#1A1200]' : 'text-[#E4E4E5]'
          }`}
        >
          {message.content}
        </Text>

        <View className="flex-row items-center justify-end mt-0.5 gap-1">
          <Text
            className={`text-[10px] ${
              isOwn ? 'text-[rgba(0,0,0,0.45)]' : 'text-[rgba(255,255,255,0.4)]'
            }`}
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
              <Text className="text-[#FF3B30] text-[11px] ml-1">Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};
