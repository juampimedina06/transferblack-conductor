import React, { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { THEME_COLORS } from '@/core/constants/theme';

interface EmergencyFABProps {
  onPress: () => void;
  bottomOffset?: number;
  isSilentAlertActive?: boolean;
  silentAlertFollowersCount?: number;
  isSilentAlertBusy?: boolean;
  onTriggerSilentAlert?: () => void;
  onCancelSilentAlert?: () => void;
}

export const EmergencyFAB = ({
  onPress,
  bottomOffset,
  isSilentAlertActive = false,
  silentAlertFollowersCount = 0,
  isSilentAlertBusy = false,
  onTriggerSilentAlert,
  onCancelSilentAlert,
}: EmergencyFABProps) => {
  const targetBottom = (bottomOffset && bottomOffset > 0 ? bottomOffset : 80) + 16;
  const animatedBottom = useSharedValue(targetBottom);

  useEffect(() => {
    animatedBottom.set(
      withSpring(targetBottom, {
        damping: 18,
        stiffness: 150,
        mass: 0.8,
      })
    );
  }, [targetBottom, animatedBottom]);

  const animatedStyle = useAnimatedStyle(() => ({
    bottom: animatedBottom.get(),
  }));

  const handleSilentToggle = (): void => {
    if (isSilentAlertBusy) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isSilentAlertActive) {
      onCancelSilentAlert?.();
    } else {
      onTriggerSilentAlert?.();
    }
  };

  const handleSilentPress = (): void => {
    // Si la carita ya está enviando ubicación, tocarla de nuevo la detiene de inmediato.
    if (isSilentAlertActive) {
      handleSilentToggle();
    }
  };

  return (
    <Animated.View
      className="absolute left-4 z-[100] items-center gap-3"
      style={animatedStyle}
      pointerEvents="box-none"
    >
      {/* Botón discreto de cara feliz: envía ubicación continua hasta volver a presionarlo */}
      {(onTriggerSilentAlert || onCancelSilentAlert) && (
        <TouchableOpacity
          onPress={handleSilentPress}
          onLongPress={handleSilentToggle}
          delayLongPress={800}
          disabled={isSilentAlertBusy}
          activeOpacity={0.85}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          className={`w-12 h-12 rounded-full items-center justify-center shadow-lg shadow-black/50 border relative ${
            isSilentAlertActive
              ? 'bg-[#141720] border-gold/80'
              : 'bg-[#12141C]/95 border-white/15'
          }`}
          accessibilityRole="button"
          accessibilityState={{ selected: isSilentAlertActive }}
          accessibilityLabel={
            isSilentAlertActive
              ? 'Presionar para finalizar el envío de ubicación a compañeros'
              : 'Mantener presionado para enviar aviso silencioso a compañeros cercanos'
          }
        >
          <Ionicons
            name="happy-outline"
            size={24}
            color={isSilentAlertActive ? THEME_COLORS.gold : '#E4E4E7'}
          />

          {/* Micro-indicador discreto de estado / cantidad de compañeros siguiendo */}
          {isSilentAlertActive && silentAlertFollowersCount > 0 ? (
            <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 items-center justify-center absolute -top-1 -right-1 border border-[#0E1015]">
              <Text className="text-[10px] font-montserrat-bold text-obsidian">
                {silentAlertFollowersCount}
              </Text>
            </View>
          ) : isSilentAlertActive ? (
            <View className="w-2.5 h-2.5 rounded-full bg-gold absolute top-0.5 right-0.5 border border-[#0E1015]" />
          ) : null}
        </TouchableOpacity>
      )}

      {/* Botón principal de funciones de seguridad (Escudo) */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className="w-14 h-14 rounded-full bg-[#1A73E8] items-center justify-center shadow-lg shadow-black/50 border border-blue-400/30"
        accessibilityRole="button"
        accessibilityLabel="Abrir funciones de seguridad"
      >
        <Ionicons name="shield" size={28} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
};
