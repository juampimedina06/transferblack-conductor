import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';

interface SwipeToArriveButtonProps {
  onArrive: () => void;
  isLoading?: boolean;
}

const BUTTON_WIDTH = 300;
const BUTTON_HEIGHT = 56;
const SWIPEABLE_WIDTH = BUTTON_HEIGHT;
const MAX_TRANSLATE = BUTTON_WIDTH - SWIPEABLE_WIDTH;

export const SwipeToArriveButton = ({ onArrive, isLoading = false }: SwipeToArriveButtonProps) => {
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleComplete = () => {
    setIsCompleted(true);
    onArrive();
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
      } else if (nextTranslate > MAX_TRANSLATE) {
        nextTranslate = MAX_TRANSLATE;
      }
      translateX.value = nextTranslate;
    })
    .onEnd(() => {
      if (isCompleted || isLoading) return;
      if (translateX.value > MAX_TRANSLATE * 0.8) {
        translateX.value = withSpring(MAX_TRANSLATE);
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

  return (
    <View style={styles.container} className="bg-obsidian border border-charcoal rounded-full justify-center shadow-lg shadow-black mx-4 my-2">
      <Text className="absolute self-center text-ash font-montserrat-bold text-sm tracking-widest">
        {isLoading ? 'NOTIFICANDO...' : 'DESLIZAR AL LLEGAR >>'}
      </Text>
      
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.swipeable, animatedStyle]} className="bg-gold rounded-full items-center justify-center">
          <Ionicons name="chevron-forward" size={24} color={THEME_COLORS.obsidian} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: BUTTON_HEIGHT,
    maxWidth: BUTTON_WIDTH,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  swipeable: {
    width: SWIPEABLE_WIDTH,
    height: SWIPEABLE_WIDTH,
    position: 'absolute',
    left: 0,
    zIndex: 10,
  }
});
