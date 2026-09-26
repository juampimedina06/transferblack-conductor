import { useEffect } from 'react';
import {
  Easing,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

export const useOfferTimer = (
  ttlSeconds: number,
  onExpire: () => void,
  isActive: boolean
) => {
  const progress = useSharedValue(1);

  useEffect(() => {
    if (isActive && ttlSeconds > 0) {
      progress.value = 1;
      progress.value = withTiming(
        0,
        {
          duration: ttlSeconds * 1000,
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) {
            runOnJS(onExpire)();
          }
        }
      );
    } else {
      progress.value = 1;
    }
  }, [isActive, ttlSeconds]);

  return { progress };
};
