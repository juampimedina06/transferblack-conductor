import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_COLORS } from '../../../core/constants/theme';
import {
  BannerNotificationType,
  useBannerNotificationStore,
} from '../../notifications/store/useBannerNotificationStore';

interface TopNotificationBannerProps {
  /**
   * Pasar `true` cuando se monta dentro de un `<Modal>` nativo para que el banner
   * quede visible por encima del modal sin duplicarse con el host raíz.
   */
  isModalHost?: boolean;
}

interface BannerVisualConfig {
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  iconBg: string;
  borderColor: string;
}

const VISUAL_CONFIG: Record<BannerNotificationType, BannerVisualConfig> = {
  success: {
    icon: 'checkmark-circle',
    accentColor: '#34D399',
    iconBg: 'rgba(16, 185, 129, 0.16)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  error: {
    icon: 'alert-circle',
    accentColor: '#F87171',
    iconBg: 'rgba(239, 68, 68, 0.16)',
    borderColor: 'rgba(248, 113, 113, 0.38)',
  },
  warning: {
    icon: 'warning',
    accentColor: '#FBBF24',
    iconBg: 'rgba(245, 158, 11, 0.16)',
    borderColor: 'rgba(251, 191, 36, 0.38)',
  },
  info: {
    icon: 'information-circle',
    accentColor: THEME_COLORS.gold,
    iconBg: 'rgba(212, 175, 55, 0.16)',
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  trip: {
    icon: 'car-sport',
    accentColor: THEME_COLORS.gold,
    iconBg: 'rgba(212, 175, 55, 0.18)',
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  chat: {
    icon: 'chatbubble-ellipses',
    accentColor: '#60A5FA',
    iconBg: 'rgba(59, 130, 246, 0.18)',
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
};

const HIDDEN_Y = -160;
const DISMISS_TRANSLATION_THRESHOLD = -28;
const DISMISS_VELOCITY_THRESHOLD = -350;

export const TopNotificationBanner: React.FC<TopNotificationBannerProps> = ({
  isModalHost = false,
}) => {
  const insets = useSafeAreaInsets();
  const current = useBannerNotificationStore((state) => state.current);
  const modalHostCount = useBannerNotificationStore((state) => state.modalHostCount);
  const dismissCurrent = useBannerNotificationStore((state) => state.dismissCurrent);
  const registerModalHost = useBannerNotificationStore((state) => state.registerModalHost);
  const unregisterModalHost = useBannerNotificationStore((state) => state.unregisterModalHost);

  const [isPaused, setIsPaused] = useState(false);
  const translateY = useSharedValue(HIDDEN_Y);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!isModalHost) return;
    registerModalHost();
    return () => {
      unregisterModalHost();
    };
  }, [isModalHost, registerModalHost, unregisterModalHost]);

  const shouldRenderHere = isModalHost || modalHostCount === 0;

  const animateOutAndDismiss = useCallback(() => {
    setIsPaused(false);
    opacity.set(withTiming(0, { duration: 160 }));
    translateY.set(
      withTiming(HIDDEN_Y, { duration: 180 }, (finished) => {
        if (finished) {
          runOnJS(dismissCurrent)();
        }
      })
    );
  }, [dismissCurrent, opacity, translateY]);

  // Animación de entrada cuando aparece un nuevo banner
  useEffect(() => {
    if (!current || !shouldRenderHere) {
      return;
    }

    translateY.set(HIDDEN_Y);
    opacity.set(0);

    translateY.set(
      withSpring(0, {
        damping: 20,
        stiffness: 240,
        mass: 0.8,
      })
    );
    opacity.set(withTiming(1, { duration: 180 }));
  }, [current, opacity, shouldRenderHere, translateY]);

  // Auto-cierre pausable mientras el conductor interactúa con el banner
  useEffect(() => {
    if (!current || !shouldRenderHere || isPaused) {
      return;
    }

    const timer = setTimeout(() => {
      animateOutAndDismiss();
    }, current.durationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [animateOutAndDismiss, current, isPaused, shouldRenderHere]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          runOnJS(setIsPaused)(true);
        })
        .onUpdate((event) => {
          if (event.translationY < 0) {
            translateY.set(event.translationY);
          } else {
            // Resistencia elástica suave si desliza hacia abajo
            translateY.set(event.translationY * 0.2);
          }
        })
        .onEnd((event) => {
          if (
            event.translationY < DISMISS_TRANSLATION_THRESHOLD ||
            event.velocityY < DISMISS_VELOCITY_THRESHOLD
          ) {
            runOnJS(animateOutAndDismiss)();
          } else {
            translateY.set(withSpring(0, { damping: 18, stiffness: 260 }));
            runOnJS(setIsPaused)(false);
          }
        }),
    [animateOutAndDismiss, translateY]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
    opacity: opacity.get(),
  }));

  if (!current || !shouldRenderHere) {
    return null;
  }

  const visual = VISUAL_CONFIG[current.type];

  const handleBannerPress = () => {
    const callback = current.onPress;
    animateOutAndDismiss();
    if (callback) {
      callback();
    }
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute top-0 left-0 right-0 px-4"
      style={{
        paddingTop: Math.max(insets.top, 12) + 6,
        zIndex: 9999,
        elevation: 40,
      }}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            animatedStyle,
            {
              backgroundColor: 'rgba(18, 19, 26, 0.97)',
              borderColor: visual.borderColor,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.45,
              shadowRadius: 18,
              elevation: 18,
            },
          ]}
          className="rounded-2xl border overflow-hidden"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Pressable
            onPress={current.onPress ? handleBannerPress : undefined}
            className="px-3.5 pt-3 pb-2.5 flex-row items-center"
          >
            {/* Ícono lateral */}
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: visual.iconBg }}
            >
              <Ionicons name={visual.icon} size={21} color={visual.accentColor} />
            </View>

            {/* Texto */}
            <View className="flex-1 pr-2">
              <Text
                className="text-platinum font-montserrat-bold text-[13px] leading-4"
                numberOfLines={1}
              >
                {current.title}
              </Text>
              {current.message ? (
                <Text
                  className="text-ash font-montserrat text-xs leading-4 mt-0.5"
                  numberOfLines={2}
                >
                  {current.message}
                </Text>
              ) : null}
            </View>

            {/* Acción opcional o botón cerrar */}
            {current.actionLabel && current.onPress ? (
              <View
                className="px-2.5 py-1.5 rounded-lg border"
                style={{
                  backgroundColor: visual.iconBg,
                  borderColor: visual.borderColor,
                }}
              >
                <Text
                  className="font-montserrat-bold text-[11px]"
                  style={{ color: visual.accentColor }}
                >
                  {current.actionLabel}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={animateOutAndDismiss}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Descartar notificación"
                className="p-1"
              >
                <Ionicons name="close" size={16} color={THEME_COLORS.ash} />
              </Pressable>
            )}
          </Pressable>

          {/* Indicador visual sutil para swipe up */}
          <View className="items-center pb-1.5">
            <View className="w-9 h-1 rounded-full bg-white/15" />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
