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
  showDivider?: boolean;
}

export function ProfileOptionItem({
  title,
  subtitle,
  iconName,
  onPress,
  badge,
  showDivider = false,
}: ProfileOptionItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="px-4 py-3.5 flex-row items-center justify-between"
      style={
        showDivider
          ? { borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' }
          : undefined
      }
    >
      <View className="flex-row items-center flex-1 mr-3">
        <Ionicons name={iconName} size={20} color={THEME_COLORS.ash} style={{ marginRight: 14 }} />
        <View className="flex-1">
          <Text className="text-platinum font-montserrat-medium text-sm">
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-ash/80 font-montserrat text-xs mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center">
        {badge ? (
          <Text className="text-emerald-400 font-montserrat-medium text-xs mr-2">
            {badge}
          </Text>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={THEME_COLORS.ashMuted} />
      </View>
    </TouchableOpacity>
  );
}
