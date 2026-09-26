import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { transferApi } from '../../../core/api/transferApi';
import { THEME_COLORS } from '../../../core/constants/theme';
import { acceptTripOffer } from '../../../core/trip/actions/trip.actions';
import { useLocationStore } from '../../maps/store/useLocationStore';
import { useOfferTimer } from '../../trip/hooks/useOfferTimer';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';

interface ConnectionBottomSheetProps {
  isAvailable: boolean;
  onToggleAvailability: (val: boolean) => void;
}

export const ConnectionBottomSheet = ({ isAvailable, onToggleAvailability }: ConnectionBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const currentOffer = useDriverTripStore((state) => state.currentOffer);
  const clearOffer = useDriverTripStore((state) => state.clearOffer);
  const lastKnownLocation = useLocationStore((state) => state.lastKnownLocation);

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [buttonWidth, setButtonWidth] = useState<number>(0);

  // Fetch active vehicle ID when online
  useEffect(() => {
    if (isAvailable && !vehicleId) {
      transferApi.get('/driver/me').then((res) => {
        const vid = res.data?.data?.vehicle?.id ||
          res.data?.data?.driverProfile?.vehicles?.[0]?.id ||
          res.data?.vehicle?.id;
        if (vid) setVehicleId(vid);
      }).catch(() => { });
    }
  }, [isAvailable, vehicleId]);

  // Radar Pulse Animation for "Buscando viajes"
  const pulseAnim = useSharedValue(0);
  useEffect(() => {
    if (isAvailable && !currentOffer) {
      pulseAnim.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    } else {
      pulseAnim.value = 0;
    }
  }, [isAvailable, currentOffer]);

  const radarWave1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [1, 2.2]) }],
    opacity: interpolate(pulseAnim.value, [0, 0.7, 1], [0.8, 0.3, 0]),
  }));

  const radarWave2Style = useAnimatedStyle(() => {
    const val = (pulseAnim.value + 0.5) % 1;
    return {
      transform: [{ scale: interpolate(val, [0, 1], [1, 2.2]) }],
      opacity: interpolate(val, [0, 0.7, 1], [0.8, 0.3, 0]),
    };
  });

  // Offer TTL Timer
  const ttl = currentOffer?.ttlSeconds || 15;
  const handleExpire = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearOffer();
  };

  const { progress } = useOfferTimer(ttl, handleExpire, !!currentOffer);

  // Haptic alert on incoming offer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentOffer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      interval = setInterval(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [currentOffer]);

  // Liquid Gold Button Draining Styles
  const liquidFillStyle = useAnimatedStyle(() => {
    const widthPercent = Math.max(0, Math.min(100, progress.value * 100));
    return {
      width: `${widthPercent}%`,
      opacity: interpolate(progress.value, [0, 0.1, 0.35, 1], [0.65, 0.78, 0.92, 1]),
    };
  });

  const liquidMeniscusStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 0.04, 0.15, 1], [0, 0.4, 0.85, 1]),
    };
  });

  // Handle Accept Trip
  const handleAccept = async () => {
    if (!currentOffer) return;
    if (!lastKnownLocation) {
      Alert.alert('Ubicación requerida', 'Esperando coordenadas del GPS...');
      return;
    }

    let activeVehicle = vehicleId;
    if (!activeVehicle) {
      try {
        const res = await transferApi.get('/driver/me');
        activeVehicle = res.data?.data?.vehicle?.id || res.data?.data?.driverProfile?.vehicles?.[0]?.id;
      } catch (e) { }
    }

    if (!activeVehicle) {
      Alert.alert('Error', 'No se pudo obtener el vehículo activo del conductor.');
      return;
    }

    try {
      setIsAccepting(true);
      await acceptTripOffer(currentOffer.tripId, {
        vehicle_id: activeVehicle,
        latitude: lastKnownLocation.latitude,
        longitude: lastKnownLocation.longitude,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearOffer();
      router.push('/(home)' as any);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Aviso', error.message);
      clearOffer();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearOffer();
  };

  // --- MODE 1: TRIP OFFER FLOATING LIQUID GLASS PANEL ---
  if (currentOffer) {
    return (
      <View
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0 w-full px-4 z-50"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="w-full bg-[#0A0B10]/90 border border-[#D4AF37]/35 rounded-[32px] p-5 shadow-2xl shadow-black overflow-hidden relative">
          {/* Champagne Ambient Glow Flares */}
          <View className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />
          <View className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-[#D4AF37]/5 blur-3xl pointer-events-none" />

          {/* Top Edge Specular Glass Reflection */}
          <View className="absolute top-0 left-8 right-8 h-[1px] bg-white/25 pointer-events-none" />

          {/* Header Row: Category Badge */}
          <View className="flex-row items-center justify-between mb-3.5">
            <View className="flex-row items-center">
              <View className="flex-row items-center bg-[#171722]/90 border border-[#D4AF37]/35 px-3 py-1.5 rounded-full mr-2.5">
                <Ionicons name="car-sport" size={13} color={THEME_COLORS.gold} />
                <Text className="text-white font-montserrat-bold text-[11px] ml-1.5 uppercase tracking-wider">
                  TransferBlack
                </Text>
              </View>
              <View className="bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-2.5 py-1 rounded-full">
                <Text className="text-[#D4AF37] font-montserrat-semibold text-[10px] tracking-widest uppercase">
                  {currentOffer.passenger?.category || 'VIP'}
                </Text>
              </View>
            </View>
          </View>

          {/* Earnings & Payment Method */}
          <View className="flex-row items-end justify-between mb-3.5 px-0.5">
            <View>
              <Text className="text-zinc-400 font-montserrat-semibold text-[10px] tracking-widest uppercase mb-1">
                Tarifa VIP • Ganancia Neta
              </Text>
              <Text className="text-white font-montserrat-bold text-3xl tracking-tight">
                ${Number(currentOffer.fare.netEarnings || currentOffer.fare.totalFare || 0).toLocaleString('es-AR')}
              </Text>
            </View>

            <View className="flex-row items-center bg-white/[0.05] border border-white/10 px-3 py-1.5 rounded-xl mb-1">
              <Ionicons
                name={currentOffer.fare.paymentMethod?.toLowerCase() === 'card' ? 'card-outline' : 'cash-outline'}
                size={14}
                color={THEME_COLORS.gold}
              />
              <Text className="text-zinc-300 font-montserrat-semibold text-xs ml-1.5 uppercase tracking-wider">
                {currentOffer.fare.paymentMethod?.toLowerCase() === 'card' ? 'Tarjeta' : 'Efectivo'}
              </Text>
            </View>
          </View>

          {/* Passenger Identity Glass Strip */}
          <View className="flex-row items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 mb-3.5">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-8 h-8 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 items-center justify-center mr-2.5">
                <Text className="text-[#D4AF37] font-montserrat-bold text-xs">
                  {(currentOffer.passenger?.fullName || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-white font-montserrat-semibold text-xs mr-1.5" numberOfLines={1}>
                    {currentOffer.passenger?.fullName || 'Identidad verificada'}
                  </Text>
                  <Ionicons name="shield-checkmark" size={13} color="#38BDF8" />
                </View>
              </View>
            </View>

            <View className="flex-row items-center bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.08]">
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text className="text-white font-montserrat-bold text-xs ml-1">
                {currentOffer.passenger?.rating ? currentOffer.passenger.rating.toFixed(2) : '4.95'}
              </Text>
              <Text className="text-zinc-400 font-montserrat text-[11px] ml-1">
                ({currentOffer.passenger?.completedTrips ?? 12})
              </Text>
            </View>
          </View>

          {/* Route Trajectory (Liquid Neon Glass) */}
          <View className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 mb-4">
            {/* Pickup Node */}
            <View className="flex-row items-start">
              <View className="items-center mr-3 mt-0.5">
                <View className="w-3.5 h-3.5 rounded-full bg-emerald-400/20 border border-emerald-400 items-center justify-center">
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                </View>
                <View className="w-0.5 h-7 border-l border-dashed border-zinc-600 my-0.5" />
              </View>

              <View className="flex-1 -mt-0.5">
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text className="text-emerald-400 font-montserrat-semibold text-[10px] uppercase tracking-wider">
                    Punto de partida
                  </Text>
                  <View className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Text className="text-emerald-400 font-montserrat-semibold text-[10px]">
                      A {currentOffer.pickup?.etaMinutes || 2} min
                    </Text>
                  </View>
                </View>
                <Text className="text-white font-montserrat-medium text-xs leading-4" numberOfLines={1}>
                  {currentOffer.pickup?.address || 'Origen solicitado'}
                </Text>
              </View>
            </View>

            {/* Dropoff Node */}
            <View className="flex-row items-start">
              <View className="items-center mr-3 mt-1">
                <View className="w-3 h-3 rounded-sm bg-[#D4AF37] rotate-45 shadow-sm shadow-[#D4AF37]/80" />
              </View>

              <View className="flex-1 mt-0.5">
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text className="text-[#D4AF37] font-montserrat-semibold text-[10px] uppercase tracking-wider">
                    Destino final
                  </Text>
                  <View className="bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                    <Text className="text-[#D4AF37] font-montserrat-semibold text-[10px]">
                      ~{currentOffer.dropoff?.durationMinutes || 15} min
                    </Text>
                  </View>
                </View>
                <Text className="text-zinc-200 font-montserrat-medium text-xs leading-4" numberOfLines={1}>
                  {currentOffer.dropoff?.address || 'Destino no especificado'}
                </Text>
              </View>
            </View>
          </View>

          {/* HERO ELEMENT: Liquid Gold Draining Glass Button */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleAccept}
            disabled={isAccepting}
            onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
            className="w-full h-14 rounded-2xl relative overflow-hidden justify-center items-center border border-[#D4AF37]/45 bg-[#121218]/90 shadow-xl shadow-black"
          >
            {/* Base Empty Glass Layer: Revealed progressively as liquid gold drains */}
            <View className="absolute inset-0 flex-row items-center justify-center bg-[#13141C]/60">
              <Text className="text-[#D4AF37] font-montserrat-bold text-sm tracking-widest uppercase">
                Aceptar Viaje
              </Text>
            </View>

            {/* Animated Liquid Gold Filling Layer: Drains organically from right to left */}
            <Animated.View
              style={[
                liquidFillStyle,
                {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  backgroundColor: THEME_COLORS.gold,
                  overflow: 'hidden',
                  justifyContent: 'center',
                },
              ]}
            >
              {/* Liquid Meniscus & Amber Glow on the leading wave edge */}
              <Animated.View
                style={[
                  liquidMeniscusStyle,
                  {
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 12,
                    backgroundColor: '#FFF7D1',
                    zIndex: 20,
                  },
                ]}
              />

              {/* Inverted Text Mask Layer: Matches exact container width for seamless typography */}
              <View
                style={{ width: buttonWidth || '100%' }}
                className="flex-row items-center justify-center absolute left-0"
              >
                {isAccepting ? (
                  <ActivityIndicator color="#0A0A0C" size="small" />
                ) : (
                  <>
                    <Ionicons name="flash" size={17} color="#0A0A0C" style={{ marginRight: 8 }} />
                    <Text className="text-[#0A0A0C] font-montserrat-bold text-sm tracking-widest uppercase">
                      Aceptar Viaje
                    </Text>
                  </>
                )}
              </View>
            </Animated.View>

            {/* Glass Specular Meniscus Reflection across the top lip */}
            <View className="absolute top-0 left-4 right-4 h-[1px] bg-white/40 z-30 pointer-events-none" />
            <View className="absolute bottom-0 left-6 right-6 h-[1px] bg-[#D4AF37]/20 z-30 pointer-events-none" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- MODE 2: SEARCHING / OFFLINE STATUS BAR ---
  return (
    <View
      key="connection-bottom-bar"
      className="absolute bottom-0 left-0 right-0 w-full bg-[#0D0D12] rounded-t-[32px] border-t border-[#23232D] shadow-2xl shadow-black z-50 overflow-hidden"
      style={{ paddingBottom: Math.max(insets.bottom, 14) }}
    >
      <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
      <View className="w-full px-6 py-2.5">
        <View className="w-full flex-row items-center justify-between">
          {/* Left: Status with Radar Beacon */}
          <View className="flex-row items-center flex-1">
            {isAvailable ? (
              <View key="radar-active" className="w-11 h-11 items-center justify-center mr-3 relative">
                <Animated.View
                  style={[
                    radarWave1Style,
                    {
                      position: 'absolute',
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: 'rgba(16, 185, 129, 0.3)',
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    radarWave2Style,
                    {
                      position: 'absolute',
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    },
                  ]}
                />
                <View className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400" />
              </View>
            ) : (
              <View key="radar-inactive" className="w-11 h-11 items-center justify-center mr-3">
                <View className="w-3 h-3 rounded-full bg-red-500/80 shadow-md shadow-red-500/50" />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-white font-montserrat-bold text-base tracking-wide">
                {isAvailable ? 'EN LÍNEA' : 'DESCONECTADO'}
              </Text>
              <Text className="text-ash font-montserrat text-xs mt-0.5">
                {isAvailable ? 'Esperando viajes en tu zona...' : 'Tocá para comenzar tu jornada'}
              </Text>
            </View>
          </View>

          {/* Right: Connect / Disconnect Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleAvailability(!isAvailable);
            }}
            className={`px-4 py-2 rounded-full border flex-row items-center ${isAvailable
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-emerald-500/10 border-emerald-500/40'
              }`}
          >
            <Ionicons
              name="power"
              size={14}
              color={isAvailable ? '#EF4444' : '#10B981'}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`font-montserrat-bold text-xs tracking-wider uppercase ${isAvailable ? 'text-red-400' : 'text-emerald-400'
                }`}
            >
              {isAvailable ? 'Desconectar' : 'Conectar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
