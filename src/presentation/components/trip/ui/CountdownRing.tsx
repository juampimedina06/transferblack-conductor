import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TripOfferTheme } from '../theme/tripOfferTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CountdownRingProps {
  theme: TripOfferTheme;
  progress: SharedValue<number>; // Valor compartido de 1 a 0
  secondsLeft: number;
  size?: number;
  strokeWidth?: number;
  isUrgent?: boolean; // True cuando quedan <= 5 segundos
}

/**
 * Anillo de cuenta regresiva SVG animado al 100% en el UI Thread mediante Reanimated.
 * Se vacía suavemente y en los últimos 5 segundos realiza una pulsación sutil y cambio de acento.
 */
export const CountdownRing: React.FC<CountdownRingProps> = React.memo(({
  theme,
  progress,
  secondsLeft,
  size = 46,
  strokeWidth = 3.5,
  isUrgent = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pulso en los últimos 5 segundos
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isUrgent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1,
        true
      );
      // Haptic ligero al entrar en zona de urgencia
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isUrgent, pulseScale]);

  const animatedCircleProps = useAnimatedProps(() => {
    'worklet';
    const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress.value)));
    const stroke = interpolateColor(
      progress.value,
      [0, 0.25, 1],
      [theme.urgentAccent, theme.urgentAccent, theme.accent]
    );

    return {
      strokeDashoffset,
      stroke,
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedContainerStyle]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Círculo de pista de fondo (vidrio/tenue) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.innerSurfaceBorder}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Anillo de progreso animado */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Segundos restantes en el centro con números tabulares */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.textCenter}>
          <Text
            style={[
              styles.secondsText,
              {
                color: isUrgent ? theme.urgentAccent : theme.accent,
                fontVariant: ['tabular-nums'],
              },
            ]}
          >
            {secondsLeft}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

CountdownRing.displayName = 'CountdownRing';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  textCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondsText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
  },
});
