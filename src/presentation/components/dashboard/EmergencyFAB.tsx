import React, { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface EmergencyFABProps {
  onPress: () => void;
  bottomOffset?: number;
}

export const EmergencyFAB = ({ onPress, bottomOffset }: EmergencyFABProps) => {
  const targetBottom = (bottomOffset && bottomOffset > 0 ? bottomOffset : 80) + 16;
  const animatedBottom = useSharedValue(targetBottom);

  useEffect(() => {
    animatedBottom.value = withSpring(targetBottom, {
      damping: 18,
      stiffness: 150,
      mass: 0.8,
    });
  }, [targetBottom, animatedBottom]);

  const animatedStyle = useAnimatedStyle(() => ({
    bottom: animatedBottom.value,
  }));

  return (
    <Animated.View 
      className="absolute left-4 z-[100]"
      style={animatedStyle}
      pointerEvents="box-none"
    >
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
