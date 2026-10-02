import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { getRoleLabel } from '@/core/chat/mapper/chat.mapper';
import { Trip } from '@/core/trip/interface/trip.interface';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface ChatHeaderProps {
  trip: Trip;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ trip }) => {
  const chat = trip.chat;
  const name = chat?.coordinator_name ?? 'Usuario';
  const role = chat?.coordinator_role;
  const roleLabel = role ? getRoleLabel(role) : 'Interlocutor';

  return (
    <View
      className="flex-row items-center px-4 py-3 bg-[#0F0F11] border-b border-[#1C1C1E]"
      accessibilityRole="header"
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="mr-3"
        accessibilityLabel="Volver"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={24} color="#D4AF37" />
      </Pressable>

      <View className="w-10 h-10 rounded-full bg-[#2C2C2E] items-center justify-center mr-3">
        <Ionicons name="person-outline" size={18} color="#D4AF37" />
      </View>

      <View className="flex-1">
        <Text
          className="text-[#E4E4E5] font-semibold text-[15px]"
          numberOfLines={1}
          accessibilityLabel={`Conversación con ${name}`}
        >
          {name}
        </Text>
        <Text className="text-[#D4AF37] text-xs mt-0.5">{roleLabel}</Text>
      </View>
    </View>
  );
};
