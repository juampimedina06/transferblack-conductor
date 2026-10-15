import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export interface RateLimitBannerProps {
  message?: string | null;
  secondsLeft?: number;
  className?: string;
}

export const RateLimitBanner: React.FC<RateLimitBannerProps> = ({
  message,
  secondsLeft,
  className = '',
}): React.JSX.Element => {
  const displayMessage =
    message ??
    (typeof secondsLeft === 'number'
      ? `Demasiados intentos. Esperá ${secondsLeft} ${
          secondsLeft === 1 ? 'segundo' : 'segundos'
        } antes de volver a intentar`
      : 'Demasiados intentos. Por favor esperá antes de volver a intentar.');

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={`flex-row items-center bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4 ${className}`}
    >
      <View className="w-8 h-8 rounded-full bg-amber-500/20 items-center justify-center mr-3">
        <Ionicons name="time-outline" size={18} color="#F59E0B" />
      </View>
      <Text className="flex-1 text-amber-200 font-montserrat-medium text-xs leading-5">
        {displayMessage}
      </Text>
    </View>
  );
};
