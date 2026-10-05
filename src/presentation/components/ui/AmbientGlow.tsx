import React, { useId } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export interface AmbientGlowProps {
  color?: string;
  height?: number;
  opacity?: number;
  position?: 'top' | 'top-left' | 'top-right' | 'center';
  style?: StyleProp<ViewStyle>;
}

export const AmbientGlow: React.FC<AmbientGlowProps> = ({
  color = '#D4AF37',
  height = 360,
  opacity = 0.22,
  position = 'top',
  style,
}) => {
  const rawId = useId();
  const gradientId = `ambient-glow-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  let cx = '50%';
  let cy = '0%';
  let rx = '70%';
  let ry = '60%';

  if (position === 'top-left') {
    cx = '0%';
    cy = '0%';
    rx = '80%';
    ry = '75%';
  } else if (position === 'top-right') {
    cx = '100%';
    cy = '0%';
    rx = '80%';
    ry = '75%';
  } else if (position === 'center') {
    cx = '50%';
    cy = '50%';
    rx = '60%';
    ry = '60%';
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        { height },
        style,
      ]}
    >
      <Svg height="100%" width="100%">
        <Defs>
          <RadialGradient
            id={gradientId}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fx={cx}
            fy={cy}
          >
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="40%" stopColor={color} stopOpacity={opacity * 0.45} />
            <Stop offset="75%" stopColor={color} stopOpacity={opacity * 0.12} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
});
