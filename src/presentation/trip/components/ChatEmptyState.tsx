import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ChatEmptyState: React.FC = () => (
  <View className="flex-1 items-center justify-center px-8" accessibilityLiveRegion="polite">
    <View className="w-16 h-16 rounded-full bg-[#1A1A1C] items-center justify-center mb-4">
      <Ionicons name="lock-closed-outline" size={28} color="#D4AF37" />
    </View>
    <Text className="text-[#E4E4E5] text-base font-semibold text-center mb-2">
      Mensajería encriptada
    </Text>
    <Text className="text-[rgba(255,255,255,0.4)] text-sm text-center leading-5">
      Para coordinación del viaje
    </Text>
  </View>
);
