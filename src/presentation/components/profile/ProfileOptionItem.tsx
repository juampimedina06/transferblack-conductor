import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '@/core/constants/theme';

interface ProfileOptionItemProps {
  title: string;
  subtitle?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: string;
}

export function ProfileOptionItem({
  title,
  subtitle,
  iconName,
  onPress,
  badge,
}: ProfileOptionItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="bg-[#12131C]/95 border border-white/12 rounded-2xl px-4 py-4 flex-row items-center justify-between shadow-lg shadow-black relative overflow-hidden mb-3"
    >
      {/* Specular top edge */}
      <View
        pointerEvents="none"
        className="absolute top-0 left-5 right-5 h-[1px] bg-white/15"
      />

      <View className="flex-row items-center flex-1 mr-3">
        <View className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/35 items-center justify-center mr-3.5">
          <Ionicons name={iconName} size={20} color={THEME_COLORS.gold} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-montserrat-bold text-sm">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-ash font-montserrat text-xs mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center">
        {badge && (
          <View className="bg-gold/15 border border-gold/40 px-2.5 py-1 rounded-full mr-2.5 flex-row items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-gold mr-1.5" />
            <Text className="text-gold font-montserrat-bold text-[10px] uppercase tracking-wider">
              {badge}
            </Text>
          </View>
        )}
        <View className="w-7 h-7 rounded-xl bg-white/[0.05] border border-white/10 items-center justify-center">
          <Ionicons name="chevron-forward" size={15} color={THEME_COLORS.gold} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
