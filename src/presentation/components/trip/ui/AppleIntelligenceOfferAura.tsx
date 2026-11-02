import React, { useEffect, useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export interface AppleIntelligenceOfferAuraProps {
  /** Si está en los últimos segundos de la oferta, intensifica el pulso cálido */
  isUrgent?: boolean;
  /** 'screen' cubre el perímetro de toda la pantalla; 'card' envuelve el contorno interno de la tarjeta */
  variant?: 'screen' | 'card';
}

/**
 * Efecto de aura perimetral inspirado en Apple Intelligence (iOS 18):
 * - No dibuja un borde duro, sino un "border-shadow" difuminado hacia adentro (vignette luminoso).
 * - Ondas de luz en Oro Champán (#FFFBEB -> #FDE047 -> #D4AF37 -> #F59E0B) orbitan continuamente
 *   por todo el perímetro cuando entra una nueva solicitud de viaje.
 * - 100% pointerEvents="none" y ejecutado en el UI thread con Reanimated.
 */
export const AppleIntelligenceOfferAura: React.FC<AppleIntelligenceOfferAuraProps> = React.memo(
  ({ isUrgent = false, variant = 'screen' }) => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const reduceMotion = useReducedMotion();
    const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

    const isCard = variant === 'card';
    const effectiveHeight = isCard ? Math.min(screenHeight * 0.58, 460) : screenHeight;

    // Ciclo continuo 0 -> 1 para orbitar las ondas luminosas alrededor del perímetro
    const orbit = useSharedValue(0);
    // Pulso de respiración secundaria para efecto orgánico tipo Apple Intelligence
    const breathe = useSharedValue(0);

    useEffect(() => {
      if (reduceMotion) {
        orbit.value = 0.25;
        breathe.value = 0.5;
        return;
      }

      const cycleDuration = isUrgent ? 2200 : 3800;

      orbit.value = 0;
      orbit.value = withRepeat(
        withTiming(1, {
          duration: cycleDuration,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      breathe.value = withRepeat(
        withSequence(
          withTiming(1, { duration: isUrgent ? 650 : 1300, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: isUrgent ? 650 : 1300, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }, [isUrgent, reduceMotion, orbit, breathe]);

    // Paleta de oro vivo estilo Apple Intelligence (Champagne -> Gold -> Warm Amber)
    const coreBrightColor = isUrgent ? '#FEF08A' : '#FFFBEB';
    const primaryGold = '#FDE047';
    const richGold = '#D4AF37';
    const warmAmber = isUrgent ? '#F97316' : '#F59E0B';

    // 1. Estilos animados de las 4 franjas base (respiración desfasada en sentido horario)
    const topEdgeStyle = useAnimatedStyle(() => {
      const wave = Math.sin(orbit.value * Math.PI * 2);
      return {
        opacity: interpolate(wave, [-1, 1], [0.5, 1]),
      };
    });

    const rightEdgeStyle = useAnimatedStyle(() => {
      const wave = Math.sin(orbit.value * Math.PI * 2 - Math.PI / 2);
      return {
        opacity: interpolate(wave, [-1, 1], [0.5, 1]),
      };
    });

    const bottomEdgeStyle = useAnimatedStyle(() => {
      const wave = Math.sin(orbit.value * Math.PI * 2 - Math.PI);
      return {
        opacity: interpolate(wave, [-1, 1], [0.55, 1]),
      };
    });

    const leftEdgeStyle = useAnimatedStyle(() => {
      const wave = Math.sin(orbit.value * Math.PI * 2 - (3 * Math.PI) / 2);
      return {
        opacity: interpolate(wave, [-1, 1], [0.5, 1]),
      };
    });

    // 2. Orbes viajeros sin bordes duros que recorren cada arista
    const topTravelerStyle = useAnimatedStyle(() => {
      const angle = orbit.value * Math.PI * 2;
      const translateX = Math.sin(angle) * (screenWidth * 0.36);
      const scaleX = interpolate(breathe.value, [0, 1], [0.95, 1.22]);
      return {
        transform: [{ translateX }, { scaleX }],
      };
    });

    const rightTravelerStyle = useAnimatedStyle(() => {
      const angle = orbit.value * Math.PI * 2 - Math.PI / 2;
      const translateY = Math.sin(angle) * (effectiveHeight * 0.3);
      const scaleY = interpolate(breathe.value, [0, 1], [0.95, 1.25]);
      return {
        transform: [{ translateY }, { scaleY }],
      };
    });

    const bottomTravelerStyle = useAnimatedStyle(() => {
      const angle = orbit.value * Math.PI * 2 - Math.PI;
      const translateX = Math.sin(angle) * (screenWidth * 0.36);
      const scaleX = interpolate(breathe.value, [0, 1], [0.98, 1.25]);
      return {
        transform: [{ translateX }, { scaleX }],
      };
    });

    const leftTravelerStyle = useAnimatedStyle(() => {
      const angle = orbit.value * Math.PI * 2 - (3 * Math.PI) / 2;
      const translateY = Math.sin(angle) * (effectiveHeight * 0.3);
      const scaleY = interpolate(breathe.value, [0, 1], [0.95, 1.25]);
      return {
        transform: [{ translateY }, { scaleY }],
      };
    });

    const horizontalOrbWidth = Math.round(screenWidth * 0.92);
    const verticalOrbHeight = Math.round(effectiveHeight * 0.65);

    return (
      <Animated.View
        pointerEvents="none"
        entering={FadeIn.duration(350)}
        exiting={FadeOut.duration(250)}
        style={StyleSheet.absoluteFill}
        className={isCard ? 'overflow-hidden rounded-t-[34px]' : 'z-40 overflow-hidden'}
      >
        {/* ==================================================================
            CAPA 1: VIGNETTE PERIMETRAL DIFUMINADO HACIA ADENTRO (BORDER SHADOW)
            ================================================================== */}

        {/* Borde Superior (difumina de arriba hacia abajo) */}
        <Animated.View pointerEvents="none" style={[styles.topStrip, topEdgeStyle]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`top-edge-${rawId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={primaryGold} stopOpacity={isCard ? 0.55 : 0.62} />
                <Stop offset="24%" stopColor={richGold} stopOpacity={isCard ? 0.3 : 0.36} />
                <Stop offset="58%" stopColor={warmAmber} stopOpacity={0.11} />
                <Stop offset="100%" stopColor={warmAmber} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#top-edge-${rawId})`} />
          </Svg>
        </Animated.View>

        {/* Borde Inferior (difumina de abajo hacia arriba) */}
        <Animated.View pointerEvents="none" style={[styles.bottomStrip, bottomEdgeStyle]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`bottom-edge-${rawId}`} x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor={primaryGold} stopOpacity={isCard ? 0.45 : 0.65} />
                <Stop offset="25%" stopColor={richGold} stopOpacity={isCard ? 0.25 : 0.38} />
                <Stop offset="60%" stopColor={warmAmber} stopOpacity={0.1} />
                <Stop offset="100%" stopColor={warmAmber} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#bottom-edge-${rawId})`} />
          </Svg>
        </Animated.View>

        {/* Borde Izquierdo (difumina de izquierda a derecha) */}
        <Animated.View pointerEvents="none" style={[styles.leftStrip, leftEdgeStyle]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`left-edge-${rawId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={primaryGold} stopOpacity={isCard ? 0.5 : 0.58} />
                <Stop offset="25%" stopColor={richGold} stopOpacity={isCard ? 0.28 : 0.32} />
                <Stop offset="60%" stopColor={warmAmber} stopOpacity={0.09} />
                <Stop offset="100%" stopColor={warmAmber} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#left-edge-${rawId})`} />
          </Svg>
        </Animated.View>

        {/* Borde Derecho (difumina de derecha a izquierda) */}
        <Animated.View pointerEvents="none" style={[styles.rightStrip, rightEdgeStyle]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`right-edge-${rawId}`} x1="100%" y1="0%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor={primaryGold} stopOpacity={isCard ? 0.5 : 0.58} />
                <Stop offset="25%" stopColor={richGold} stopOpacity={isCard ? 0.28 : 0.32} />
                <Stop offset="60%" stopColor={warmAmber} stopOpacity={0.09} />
                <Stop offset="100%" stopColor={warmAmber} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#right-edge-${rawId})`} />
          </Svg>
        </Animated.View>

        {/* ==================================================================
            CAPA 2: ONDAS DE LUZ DORADA EN MOVIMIENTO (ORBITANDO LOS 4 BORDES)
            ================================================================== */}

        {/* Onda viajera Superior */}
        <View pointerEvents="none" style={styles.topOrbContainer}>
          <Animated.View
            style={[
              { width: horizontalOrbWidth, height: 80 },
              topTravelerStyle,
            ]}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient
                  id={`top-orb-${rawId}`}
                  cx="50%"
                  cy="0%"
                  rx="50%"
                  ry="100%"
                  fx="50%"
                  fy="0%"
                >
                  <Stop offset="0%" stopColor={coreBrightColor} stopOpacity={0.78} />
                  <Stop offset="28%" stopColor={primaryGold} stopOpacity={0.5} />
                  <Stop offset="62%" stopColor={richGold} stopOpacity={0.18} />
                  <Stop offset="100%" stopColor={warmAmber} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#top-orb-${rawId})`} />
            </Svg>
          </Animated.View>
        </View>

        {/* Onda viajera Derecha */}
        <View pointerEvents="none" style={styles.rightOrbContainer}>
          <Animated.View
            style={[
              { width: 64, height: verticalOrbHeight },
              rightTravelerStyle,
            ]}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient
                  id={`right-orb-${rawId}`}
                  cx="100%"
                  cy="50%"
                  rx="100%"
                  ry="50%"
                  fx="100%"
                  fy="50%"
                >
                  <Stop offset="0%" stopColor={coreBrightColor} stopOpacity={0.74} />
                  <Stop offset="28%" stopColor={primaryGold} stopOpacity={0.46} />
                  <Stop offset="62%" stopColor={richGold} stopOpacity={0.15} />
                  <Stop offset="100%" stopColor={warmAmber} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#right-orb-${rawId})`} />
            </Svg>
          </Animated.View>
        </View>

        {/* Onda viajera Inferior */}
        <View pointerEvents="none" style={styles.bottomOrbContainer}>
          <Animated.View
            style={[
              { width: horizontalOrbWidth, height: 84 },
              bottomTravelerStyle,
            ]}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient
                  id={`bottom-orb-${rawId}`}
                  cx="50%"
                  cy="100%"
                  rx="50%"
                  ry="100%"
                  fx="50%"
                  fy="100%"
                >
                  <Stop offset="0%" stopColor={coreBrightColor} stopOpacity={0.75} />
                  <Stop offset="30%" stopColor={primaryGold} stopOpacity={0.46} />
                  <Stop offset="65%" stopColor={richGold} stopOpacity={0.16} />
                  <Stop offset="100%" stopColor={warmAmber} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#bottom-orb-${rawId})`} />
            </Svg>
          </Animated.View>
        </View>

        {/* Onda viajera Izquierda */}
        <View pointerEvents="none" style={styles.leftOrbContainer}>
          <Animated.View
            style={[
              { width: 64, height: verticalOrbHeight },
              leftTravelerStyle,
            ]}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient
                  id={`left-orb-${rawId}`}
                  cx="0%"
                  cy="50%"
                  rx="100%"
                  ry="50%"
                  fx="0%"
                  fy="50%"
                >
                  <Stop offset="0%" stopColor={coreBrightColor} stopOpacity={0.74} />
                  <Stop offset="28%" stopColor={primaryGold} stopOpacity={0.46} />
                  <Stop offset="62%" stopColor={richGold} stopOpacity={0.15} />
                  <Stop offset="100%" stopColor={warmAmber} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#left-orb-${rawId})`} />
            </Svg>
          </Animated.View>
        </View>
      </Animated.View>
    );
  }
);

AppleIntelligenceOfferAura.displayName = 'AppleIntelligenceOfferAura';

const styles = StyleSheet.create({
  topStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 52,
  },
  bottomStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  leftStrip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 38,
  },
  rightStrip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 38,
  },
  topOrbContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    alignItems: 'center',
  },
  bottomOrbContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 84,
    alignItems: 'center',
  },
  leftOrbContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 64,
    justifyContent: 'center',
  },
  rightOrbContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 64,
    justifyContent: 'center',
  },
});
