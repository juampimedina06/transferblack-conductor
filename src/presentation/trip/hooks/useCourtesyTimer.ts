import { useState, useEffect } from 'react';
import { useDriverTripStore } from '../store/useDriverTripStore';

export const useCourtesyTimer = (initialMinutes: number = 5) => {
  const arrivedAt = useDriverTripStore((state) => state.arrivedAt);
  const totalSeconds = initialMinutes * 60;

  const calculateRemaining = () => {
    if (!arrivedAt) return totalSeconds;
    const elapsed = Math.floor((Date.now() - arrivedAt) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  };

  const [timeLeft, setTimeLeft] = useState(calculateRemaining);

  useEffect(() => {
    setTimeLeft(calculateRemaining());
    const timerId = setInterval(() => {
      setTimeLeft(calculateRemaining());
    }, 1000);

    return () => clearInterval(timerId);
  }, [arrivedAt]);

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
