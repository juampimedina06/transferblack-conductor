import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getRoleLabel } from '@/core/chat/mapper/chat.mapper';
import { Trip } from '@/core/trip/interface/trip.interface';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '@/core/constants/theme';
import { LiquidGlassContainer } from '@/presentation/components/ui/LiquidGlassContainer';

interface ChatHeaderProps {
  trip: Trip;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ trip }) => {
  const chat = trip.chat;
  const name = chat?.coordinator_name ?? (trip.passenger?.fullName || 'Pasajero');
  const role = chat?.coordinator_role;
  const roleLabel = role ? getRoleLabel(role) : 'Pasajero';

  return (
    <LiquidGlassContainer
      variant="default"
      className="flex-row items-center px-4 py-3 border-b border-white/10"
      accessibilityRole="header"
    >
      <TouchableOpacity
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="w-11 h-11 rounded-2xl items-center justify-center bg-white/5 border border-white/10 mr-3 active:scale-95"
        accessibilityLabel="Volver"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={22} color={THEME_COLORS.gold} />
      </TouchableOpacity>

      <View className="w-11 h-11 rounded-2xl bg-white/5 items-center justify-center mr-3 border border-white/10">
        <Ionicons name="person" size={20} color={THEME_COLORS.platinum} />
      </View>

      <View className="flex-1">
        <Text
          className="text-white font-montserrat-semibold text-[15px]"
          numberOfLines={1}
          accessibilityLabel={`Conversación con ${name}`}
        >
          {name}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-0.5">
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <Text className="text-gold font-montserrat text-xs capitalize">{roleLabel}</Text>
        </View>
      </View>
    </LiquidGlassContainer>
  );
};

