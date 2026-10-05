import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { THEME_COLORS } from '../../../core/constants/theme';

interface MapControlsDockProps {
  isPolyline: boolean;
  onTogglePolyline: () => void;
  isFollowingUser: boolean;
  onToggleFollowUser: () => void;
  onRecenter: () => void;
  bottomOffset?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const MapControlsDock = ({
  isPolyline,
  onTogglePolyline,
  isFollowingUser,
  onToggleFollowUser,
  onRecenter,
  bottomOffset,
}: MapControlsDockProps) => {
  const targetBottom = (bottomOffset && bottomOffset > 0 ? bottomOffset : 90) + 16;
  const animatedBottom = useSharedValue(targetBottom);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  useEffect(() => {
    animatedBottom.value = withSpring(targetBottom, {
      damping: 18,
      stiffness: 150,
      mass: 0.8,
    });
  }, [targetBottom, animatedBottom]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    })
    .onEnd(() => {
      // Boundaries: right=16, bottom=animatedBottom
      const minX = -(SCREEN_WIDTH - 54 - 28);
      const maxX = 6;
      const minY = -(SCREEN_HEIGHT - targetBottom - 160);
      const maxY = 20;

      if (translateX.value < minX) {
        translateX.value = withSpring(minX, { damping: 18, stiffness: 200 });
      } else if (translateX.value > maxX) {
        translateX.value = withSpring(maxX, { damping: 18, stiffness: 200 });
      }

      if (translateY.value < minY) {
        translateY.value = withSpring(minY, { damping: 18, stiffness: 200 });
      } else if (translateY.value > maxY) {
        translateY.value = withSpring(maxY, { damping: 18, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    bottom: animatedBottom.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="absolute right-4 z-40 items-center"
        style={animatedStyle}
      >
        <View className="w-[52px] bg-[#0A0B10]/90 rounded-[26px] border border-white/15 items-center py-2 shadow-2xl shadow-black relative overflow-hidden">
          {/* Top Specular Edge Highlight matching Security Screen */}
          <View className="absolute top-0 left-2 right-2 h-[1px] bg-white/25 pointer-events-none" />

          {/* Micro Drag Handle */}
          <View className="w-5 h-1 rounded-full bg-white/25 mb-1.5 mt-0.5 pointer-events-none" />

          {/* Button 1: Toggle Route Polyline */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTogglePolyline();
            }}
            className={`w-10 h-10 rounded-2xl items-center justify-center ${
              isPolyline ? 'bg-gold/15 border border-gold/30' : 'bg-white/[0.04]'
            }`}
            accessibilityRole="button"
            accessibilityLabel={isPolyline ? 'Ocultar ruta' : 'Mostrar ruta'}
          >
            <Ionicons
              name={isPolyline ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={isPolyline ? THEME_COLORS.gold : THEME_COLORS.ash}
            />
          </TouchableOpacity>

          {/* Sutil Divider */}
          <View className="w-6 h-[1px] bg-white/10 my-1.5 pointer-events-none" />

          {/* Button 2: Toggle Follow Driver */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleFollowUser();
            }}
            className={`w-10 h-10 rounded-2xl items-center justify-center ${
              isFollowingUser ? 'bg-gold/15 border border-gold/30' : 'bg-white/[0.04]'
            }`}
            accessibilityRole="button"
            accessibilityLabel={isFollowingUser ? 'Desactivar seguimiento' : 'Activar seguimiento'}
          >
            <Ionicons
              name={isFollowingUser ? 'navigate' : 'navigate-outline'}
              size={20}
              color={isFollowingUser ? THEME_COLORS.gold : THEME_COLORS.ash}
            />
          </TouchableOpacity>

          {/* Sutil Divider */}
          <View className="w-6 h-[1px] bg-white/10 my-1.5 pointer-events-none" />

          {/* Button 3: Recenter Map */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRecenter();
            }}
            className="w-10 h-10 rounded-2xl items-center justify-center bg-white/[0.04] active:bg-white/10"
            accessibilityRole="button"
            accessibilityLabel="Centrar mapa en mi ubicación"
          >
            <Ionicons
              name="locate-outline"
              size={20}
              color={THEME_COLORS.platinum}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};
