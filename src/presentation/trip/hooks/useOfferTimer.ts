import { useEffect, useRef } from 'react';
import {
  Easing,
  useSharedValue,
  withTiming,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';

export const useOfferTimer = (
  ttlSeconds: number,
  onExpire: () => void,
  isActive: boolean,
  offerKey?: string
) => {
  const progress = useSharedValue(1);

  // The countdown must not depend on onExpire: ConnectionBottomSheet passes a
  // plain arrow, so listing it would restart the animation on every render.
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    cancelAnimation(progress);

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
            runOnJS(triggerExpire)();
          }
        }
      );
    } else {
      progress.value = 1;
    }

    function triggerExpire() {
      onExpireRef.current();
    }

    return () => {
      cancelAnimation(progress);
    };
  }, [isActive, ttlSeconds, progress, offerKey]);

  return { progress };
};
