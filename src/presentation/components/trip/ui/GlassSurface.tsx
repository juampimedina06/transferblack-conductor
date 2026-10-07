import React from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { TripOfferTheme } from '../theme/tripOfferTheme';

// Detección segura de Liquid Glass (iOS 26+ / compatible)
let isLiquidGlassSupported = false;
let GlassViewComponent: any = null;

try {
  if (Platform.OS === 'ios') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const glassModule = require('expo-glass-effect');
    if (glassModule?.isLiquidGlassAvailable?.()) {
      isLiquidGlassSupported = true;
      GlassViewComponent = glassModule.GlassView;
    }
  }
} catch {
  isLiquidGlassSupported = false;
  GlassViewComponent = null;
}

export interface GlassSurfaceProps {
  children?: React.ReactNode;
  theme: TripOfferTheme;
  borderRadius?: number;
  borderWidth?: number;
  hasSpecularHighlight?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  overflowHidden?: boolean;
  testID?: string;
}

/**
 * Componente unificado Liquid Glass:
 * - Utiliza `GlassView` nativo de `expo-glass-effect` en iOS compatible.
 * - Fallback automático en iOS anterior y Android: `BlurView` (intensity calibrada) + overlay RGBA + borde 1px.
 * - Highlight especular superior para profundidad fotorrealista.
 */
export const GlassSurface: React.FC<GlassSurfaceProps> = React.memo(({
  children,
  theme,
  borderRadius = 32,
  borderWidth = 1,
  hasSpecularHighlight = true,
  style,
  contentStyle,
  overflowHidden = true,
  testID,
}) => {
  const containerStyle: ViewStyle = {
    borderRadius,
    borderWidth,
    borderColor: theme.glassBorderColor,
    backgroundColor: theme.glassBackground,
    overflow: overflowHidden ? 'hidden' : 'visible',
    // Sombras suaves y difusas (evita bordes negros duros)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: theme.isDark ? 0.35 : 0.12,
    shadowRadius: 28,
    elevation: 8,
  };

  // Rama 1: Liquid Glass nativo de iOS si está disponible
  if (isLiquidGlassSupported && GlassViewComponent) {
    return (
      <View testID={testID} style={[containerStyle, style]}>
        <GlassViewComponent
          style={StyleSheet.absoluteFill}
          glassEffectStyle={theme.isDark ? 'dark' : 'light'}
        />
        {hasSpecularHighlight && (
          <View
            pointerEvents="none"
            style={[
              styles.specularLine,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(255, 255, 255, 0.40)'
                  : 'rgba(255, 255, 255, 0.75)',
              },
            ]}
          />
        )}
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  // Rama 2: Fallback BlurView + Overlay calibrado (Android e iOS previo)
  return (
    <View testID={testID} style={[containerStyle, style]}>
      {/* Capa de desenfoque nativa con expo-blur */}
      <BlurView
        intensity={theme.blurIntensity}
        tint={theme.isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />

      {/* Tinte de superficie de vidrio */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.glassBackground,
            borderRadius,
          },
        ]}
      />

      {/* Highlight especular superior (luz incidente en borde superior) */}
      {hasSpecularHighlight && (
        <View
          pointerEvents="none"
          style={[
            styles.specularLine,
            {
              backgroundColor: theme.isDark
                ? 'rgba(255, 255, 255, 0.38)'
                : 'rgba(255, 255, 255, 0.70)',
            },
          ]}
        />
      )}

      {/* Contenido */}
      <View style={contentStyle}>{children}</View>
    </View>
  );
});

GlassSurface.displayName = 'GlassSurface';

const styles = StyleSheet.create({
  specularLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    zIndex: 10,
  },
});
