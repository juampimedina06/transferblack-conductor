import React from 'react';
import { View, ViewProps, StyleSheet, Platform } from 'react-native';

export type GlassVariant = 'default' | 'elevated' | 'gold' | 'danger' | 'success';

export interface LiquidGlassContainerProps extends ViewProps {
  children?: React.ReactNode;
  variant?: GlassVariant;
  intensity?: 'subtle' | 'medium' | 'deep';
  glow?: boolean;
  highlight?: boolean;
}

export const LiquidGlassContainer: React.FC<LiquidGlassContainerProps> = ({
  children,
  variant = 'default',
  intensity = 'medium',
  glow = true,
  highlight = true,
  style,
  className,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'gold':
        return styles.goldVariant;
      case 'elevated':
        return styles.elevatedVariant;
      case 'danger':
        return styles.dangerVariant;
      case 'success':
        return styles.successVariant;
      default:
        return styles.defaultVariant;
    }
  };

  const getHighlightColor = () => {
    switch (variant) {
      case 'gold':
        return 'rgba(212, 175, 55, 0.45)';
      case 'danger':
        return 'rgba(239, 68, 68, 0.45)';
      case 'success':
        return 'rgba(16, 185, 129, 0.45)';
      default:
        return 'rgba(255, 255, 255, 0.28)';
    }
  };

  const getGlowColor = () => {
    switch (variant) {
      case 'gold':
        return 'rgba(212, 175, 55, 0.12)';
      case 'danger':
        return 'rgba(239, 68, 68, 0.12)';
      case 'success':
        return 'rgba(16, 185, 129, 0.12)';
      default:
        return 'rgba(255, 255, 255, 0.05)';
    }
  };

  return (
    <View
      style={[styles.container, getVariantStyles(), style]}
      className={className}
      {...props}
    >
      {/* Specular Top Edge Light Refraction */}
      {highlight && (
        <View
          style={[
            styles.specularHighlight,
            { backgroundColor: getHighlightColor() },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Ambient Radial Depth Flare */}
      {glow && (
        <View
          style={[
            styles.glowFlare,
            { backgroundColor: getGlowColor() },
          ]}
          pointerEvents="none"
        />
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  defaultVariant: {
    backgroundColor: 'rgba(15, 16, 22, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  elevatedVariant: {
    backgroundColor: 'rgba(20, 21, 29, 0.94)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  goldVariant: {
    backgroundColor: 'rgba(18, 17, 24, 0.92)',
    borderColor: 'rgba(212, 175, 55, 0.38)',
  },
  dangerVariant: {
    backgroundColor: 'rgba(28, 12, 16, 0.92)',
    borderColor: 'rgba(239, 68, 68, 0.38)',
  },
  successVariant: {
    backgroundColor: 'rgba(10, 24, 18, 0.92)',
    borderColor: 'rgba(16, 185, 129, 0.38)',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    zIndex: 10,
  },
  glowFlare: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    zIndex: 1,
  },
});
