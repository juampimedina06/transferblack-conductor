import { useState, useEffect } from 'react';
import { useDriverTripStore } from '../store/useDriverTripStore';

export const getCourtesySecondsLeft = (
  arrivedAt: number | null,
  totalSeconds: number,
  now: number = Date.now(),
): number => {
  if (!arrivedAt) return totalSeconds;
  const elapsed = Math.floor((now - arrivedAt) / 1000);
  // Clamp both ends: a persisted or clock-skewed arrivedAt in the future would
  // otherwise report more time than the courtesy window actually allows.
  return Math.min(totalSeconds, Math.max(0, totalSeconds - elapsed));
};

export const useCourtesyTimer = (initialMinutes: number = 5) => {
  const arrivedAt = useDriverTripStore((state) => state.arrivedAt);
  const totalSeconds = initialMinutes * 60;

  const calculateRemaining = () => getCourtesySecondsLeft(arrivedAt, totalSeconds);

  const [timeLeft, setTimeLeft] = useState(calculateRemaining);
  const [prevArrivedAt, setPrevArrivedAt] = useState(arrivedAt);

  // The driver can arrive mid-screen, so the countdown is recomputed while
  // rendering instead of inside the effect. React re-runs the render before
  // painting, so the timer never shows a value from the previous trip.
  if (arrivedAt !== prevArrivedAt) {
    setPrevArrivedAt(arrivedAt);
    setTimeLeft(calculateRemaining());
  }

  useEffect(() => {
    const timerId = setInterval(() => {
      setTimeLeft(getCourtesySecondsLeft(arrivedAt, totalSeconds));
    }, 1000);

    return () => clearInterval(timerId);
  }, [arrivedAt, totalSeconds]);

  const isFinished = timeLeft <= 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    timeLeft,
    isFinished,
    formattedTime,
  };
};
