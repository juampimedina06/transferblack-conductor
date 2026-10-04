import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="bg-[#1A1A1C]/80 border border-[#2C2C2E] rounded-2xl px-4 py-3.5 flex-row items-center justify-between shadow-sm shadow-black"
    >
      <View className="flex-row items-center flex-1 mr-3">
        <View className="w-10 h-10 rounded-xl bg-charcoal/60 items-center justify-center mr-3 border border-white/[0.05]">
          <Ionicons name={iconName} size={20} color={THEME_COLORS.gold} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-montserrat-semibold text-sm">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-ash font-montserrat text-xs mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center space-x-2">
        {badge && (
          <View className="bg-charcoal px-2 py-0.5 rounded-full mr-2">
            <Text className="text-ash font-montserrat text-[10px]">
              {badge}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={THEME_COLORS.ash} />
      </View>
    </TouchableOpacity>
  );
}
