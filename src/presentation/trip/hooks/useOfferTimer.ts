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
  offerKey?: string,
  expiresAt?: string | null
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

    if (isActive) {
      let durationMs = ttlSeconds * 1000;

      if (expiresAt) {
        const remainingMs = new Date(expiresAt).getTime() - Date.now();
        if (remainingMs <= 0) {
          progress.value = 0;
          onExpireRef.current();
          return;
        }
        durationMs = remainingMs;
      }

      if (durationMs > 0) {
        progress.value = 1;
        progress.value = withTiming(
          0,
          {
            duration: durationMs,
            easing: Easing.linear,
          },
          (finished) => {
            if (finished) {
              runOnJS(triggerExpire)();
            }
          }
        );
      } else {
        progress.value = 0;
        onExpireRef.current();
      }
    } else {
      progress.value = 1;
    }

    function triggerExpire() {
      onExpireRef.current();
    }

    return () => {
      cancelAnimation(progress);
    };
  }, [isActive, ttlSeconds, progress, offerKey, expiresAt]);

  return { progress };
};
