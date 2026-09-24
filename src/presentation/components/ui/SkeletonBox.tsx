import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ViewProps } from 'react-native';

interface SkeletonBoxProps extends ViewProps {
  className?: string;
}

export function SkeletonBox({ className, style, ...rest }: SkeletonBoxProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const combinedClassName = className ? `bg-charcoal/50 rounded-md ${className}` : 'bg-charcoal/50 rounded-md';

  return (
    <Animated.View
      className={combinedClassName}
      style={[animatedStyle, style]}
      {...rest}
    />
  );
}
