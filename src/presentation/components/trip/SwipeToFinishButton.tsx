import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';

interface SwipeToFinishButtonProps {
  onFinish: () => void;
  isLoading?: boolean;
}

const BUTTON_HEIGHT = 60;
const SWIPEABLE_WIDTH = BUTTON_HEIGHT - 6;

export const SwipeToFinishButton = ({ onFinish, isLoading = false }: SwipeToFinishButtonProps) => {
  const [containerWidth, setContainerWidth] = useState<number>(320);
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const maxTranslate = Math.max(0, containerWidth - SWIPEABLE_WIDTH - 6);

  const handleComplete = () => {
    setIsCompleted(true);
    onFinish();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      if (isCompleted || isLoading) return;
      let nextTranslate = contextX.value + event.translationX;
      if (nextTranslate < 0) {
        nextTranslate = 0;
      } else if (nextTranslate > maxTranslate) {
        nextTranslate = maxTranslate;
      }
      translateX.value = nextTranslate;
    })
    .onEnd(() => {
      if (isCompleted || isLoading) return;
      if (translateX.value > maxTranslate * 0.75) {
        translateX.value = withSpring(maxTranslate);
        runOnJS(handleComplete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View 
      onLayout={onLayout}
      style={styles.container} 
      className="bg-[#0F1016]/95 border border-[#D4AF37]/45 rounded-full justify-center shadow-xl shadow-black w-full relative overflow-hidden my-2"
    >
      {/* Specular Top Edge Light Refraction */}
      <View className="absolute top-0 left-6 right-6 h-[1px] bg-white/20 pointer-events-none" />

      <Text className="absolute self-center text-platinum font-montserrat-bold text-xs tracking-widest uppercase">
        {isLoading ? 'FINALIZANDO VIAJE...' : 'DESLIZAR AL COMPLETAR >>'}
      </Text>
      
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={[styles.swipeable, animatedStyle]} 
          className="bg-gold rounded-full items-center justify-center shadow-lg shadow-black"
        >
          <Ionicons name="chevron-forward" size={26} color={THEME_COLORS.obsidian} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: BUTTON_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: 3,
  },
  swipeable: {
    width: SWIPEABLE_WIDTH,
    height: SWIPEABLE_WIDTH,
    position: 'absolute',
    left: 3,
    top: 3,
    zIndex: 10,
  }
});
