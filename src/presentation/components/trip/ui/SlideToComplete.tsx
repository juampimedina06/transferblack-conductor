import React, { useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TripOfferTheme } from '../theme/tripOfferTheme';

export interface SlideToCompleteProps {
  theme: TripOfferTheme;
  onComplete: () => void;
  isLoading?: boolean;
  label?: string;
  loadingLabel?: string;
  disabled?: boolean;
}

const BUTTON_HEIGHT = 58;
const THUMB_SIZE = BUTTON_HEIGHT - 6;

/**
 * Control deslizante 'Slide to Complete' de alta precisión:
 * - Prevención estricta de pulsaciones accidentales al finalizar el viaje.
 * - Feedback háptico progresivo en el arrastre (25%, 50%, 75%).
 * - Ejecución 100% en UI thread con Reanimated + Gesture Handler.
 * - Highlight especular y diseño consistente con la familia Liquid Glass.
 */
export const SlideToComplete: React.FC<SlideToCompleteProps> = React.memo(({
  theme,
  onComplete,
  isLoading = false,
  label = 'DESLIZAR AL FINALIZAR',
  loadingLabel = 'FINALIZANDO VIAJE...',
  disabled = false,
}) => {
  const reducedMotion = useReducedMotion();
  const [containerWidth, setContainerWidth] = useState<number>(320);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);
  const lastMilestone = useSharedValue(0);

  const maxTranslate = Math.max(0, containerWidth - THUMB_SIZE - 6);

  const triggerLightHaptic = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerSuccessHaptic = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleFinish = () => {
    setIsCompleted(true);
    triggerSuccessHaptic();
    onComplete();
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled && !isLoading && !isCompleted)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      contextX.value = translateX.value;
      lastMilestone.value = 0;
    })
    .onUpdate((event) => {
      if (isCompleted || isLoading || disabled) return;

      let nextTranslate = contextX.value + event.translationX;
      if (nextTranslate < 0) nextTranslate = 0;
      if (nextTranslate > maxTranslate) nextTranslate = maxTranslate;

      translateX.value = nextTranslate;

      // Haptic progresivo en 25%, 50%, 75%
      const progress = maxTranslate > 0 ? nextTranslate / maxTranslate : 0;
      if (progress >= 0.75 && lastMilestone.value < 3) {
        lastMilestone.value = 3;
        runOnJS(triggerLightHaptic)();
      } else if (progress >= 0.5 && lastMilestone.value < 2) {
        lastMilestone.value = 2;
        runOnJS(triggerLightHaptic)();
      } else if (progress >= 0.25 && lastMilestone.value < 1) {
        lastMilestone.value = 1;
        runOnJS(triggerLightHaptic)();
      }
    })
    .onEnd(() => {
      if (isCompleted || isLoading || disabled) return;

      if (translateX.value > maxTranslate * 0.75) {
        translateX.value = withTiming(maxTranslate, {
          duration: 180,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        runOnJS(handleFinish)();
      } else {
        translateX.value = withTiming(0, {
          duration: 220,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    });

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => {
    const opacity = maxTranslate > 0 ? Math.max(0.2, 1 - (translateX.value / maxTranslate) * 1.2) : 1;
    return { opacity };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor: theme.innerSurfaceBg,
          borderColor: theme.accentBorder,
        },
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || isLoading }}
    >
      {/* Specular line */}
      <View
        pointerEvents="none"
        style={[
          styles.specularLine,
          { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.6)' },
        ]}
      />

      {/* Label central */}
      <Animated.View style={[styles.labelWrapper, textAnimatedStyle]}>
        <Text
          numberOfLines={1}
          style={[
            styles.labelText,
            { color: theme.textSecondary },
          ]}
        >
          {isLoading ? loadingLabel : `${label} >>`}
        </Text>
      </Animated.View>

      {/* Thumb arrastrable */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: theme.accent,
              shadowColor: theme.accent,
            },
            thumbAnimatedStyle,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.accentForeground} />
          ) : (
            <Ionicons name="chevron-forward" size={24} color={theme.accentForeground} />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

SlideToComplete.displayName = 'SlideToComplete';

const styles = StyleSheet.create({
  container: {
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT / 2,
    borderWidth: 1.2,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    paddingHorizontal: 3,
    marginVertical: 6,
  },
  specularLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    zIndex: 2,
  },
  labelWrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIZE + 8,
  },
  labelText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 3,
    top: 3,
    zIndex: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});
