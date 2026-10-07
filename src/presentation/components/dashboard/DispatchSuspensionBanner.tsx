import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDriverStatusStore } from '../../driver/store/useDriverStatusStore';

export const DispatchSuspensionBanner: React.FC = () => {
  const dispatchSuspendedUntil = useDriverStatusStore((state) => state.dispatchSuspendedUntil);
  const setDispatchSuspendedUntil = useDriverStatusStore((state) => state.setDispatchSuspendedUntil);
  const fetchStatus = useDriverStatusStore((state) => state.fetchStatus);

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!dispatchSuspendedUntil) {
      return;
    }

    const updateTimer = () => {
      const diff = Math.floor((new Date(dispatchSuspendedUntil).getTime() - Date.now()) / 1000);
      const remaining = Math.max(0, diff);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        setDispatchSuspendedUntil(null);
        void fetchStatus();
      }
    };

    const timer = setTimeout(updateTimer, 0);
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [dispatchSuspendedUntil, setDispatchSuspendedUntil, fetchStatus]);

  if (!dispatchSuspendedUntil || remainingSeconds <= 0) {
    return null;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedCountdown = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <View className="w-full px-4 mb-2 z-50">
      <View className="bg-amber-500/90 rounded-2xl p-3.5 shadow-lg shadow-black/60 flex-row items-center border border-amber-400">
        <View className="w-9 h-9 rounded-xl bg-amber-950/40 items-center justify-center mr-3">
          <Ionicons name="pause-circle" size={22} color="#FFF" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-montserrat-bold text-xs uppercase tracking-wider">
              Despacho pausado
            </Text>
            <View className="bg-black/30 px-2 py-0.5 rounded-full">
              <Text className="text-white font-montserrat-bold text-[11px]">
                {formattedCountdown}
              </Text>
            </View>
          </View>
          <Text className="text-white/90 font-montserrat-medium text-[11px] leading-4 mt-0.5">
            Pausa temporal por cancelaciones reiteradas. No recibirás nuevas ofertas hasta que termine el tiempo.
          </Text>
        </View>
      </View>
    </View>
  );
};
