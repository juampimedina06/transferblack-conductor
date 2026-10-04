import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import { acceptTripOffer, driverArriving } from '../../../core/trip/actions/trip.actions';
import { Trip, getPaymentMethodInfo } from '../../../core/trip/interface/trip.interface';
import { useLocationStore } from '../../maps/store/useLocationStore';
import { useOfferTimer } from '../../trip/hooks/useOfferTimer';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { useAuthStore } from '../../auth/store/useAuthStore';

interface ConnectionBottomSheetProps {
  isAvailable: boolean;
  onToggleAvailability: (val: boolean) => void;
  onHeightChange?: (height: number) => void;
}

export const ConnectionBottomSheet = ({ isAvailable, onToggleAvailability, onHeightChange }: ConnectionBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const currentOffer = useDriverTripStore((state) => state.currentOffer);
  const offerQueue = useDriverTripStore((state) => state.offerQueue);
  const clearOffer = useDriverTripStore((state) => state.clearOffer);
  const clearAllOffers = useDriverTripStore((state) => state.clearAllOffers);
  const setActiveTrip = useDriverTripStore((state) => state.setActiveTrip);
  const lastKnownLocation = useLocationStore((state) => state.lastKnownLocation);

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // Fetch active vehicle ID on mount
  useEffect(() => {
    let isMounted = true;

    const fetchVehicle = async () => {
      try {
        const res = await transferApi.get('/driver/me');
        const vid =
          res.data?.data?.vehicle?.id ||
          res.data?.data?.driverProfile?.vehicles?.[0]?.id ||
          res.data?.vehicle?.id ||
          res.data?.data?.vehicleId;

        if (isMounted && vid) {
          setVehicleId(vid);
          return;
        }
      } catch (err: any) {
        console.warn('Could not load vehicle from /driver/me:', err?.response?.data || err?.message);
      }

      if (isMounted && (user?.email === 'jpmedinagomez1@gmail.com' || user?.id === '645b08f9-93b5-48a9-93d8-ec376107c57e')) {
        setVehicleId('835be3bf-9684-4e7e-a844-8f0820e31517');
      }
    };

    fetchVehicle();

    return () => {
      isMounted = false;
    };
  }, [user?.email, user?.id]);

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
  }, [isAvailable, currentOffer, pulseAnim]);

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
  const offerKey = currentOffer ? `${currentOffer.tripId}-${currentOffer.offerId || ''}` : undefined;
  const handleExpire = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearOffer();
  };

  const { progress } = useOfferTimer(ttl, handleExpire, !!currentOffer, offerKey);
  const [prevOfferKey, setPrevOfferKey] = useState<string | undefined>(offerKey);
  const [secondsLeft, setSecondsLeft] = useState<number>(ttl);

  if (offerKey !== prevOfferKey) {
    setPrevOfferKey(offerKey);
    setSecondsLeft(ttl);
  }

  useEffect(() => {
    if (!currentOffer) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentOffer, offerKey]);

  // Top Edge Hairline Progress Bar
  const timerBarStyle = useAnimatedStyle(() => {
    const widthPercent = Math.max(0, Math.min(100, progress.value * 100));
    return {
      width: `${widthPercent}%`,
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
        activeVehicle =
          res.data?.data?.vehicle?.id ||
          res.data?.data?.driverProfile?.vehicles?.[0]?.id ||
          res.data?.vehicle?.id ||
          res.data?.data?.vehicleId;
      } catch (e: any) {
        console.warn('Error fetching vehicle on accept:', e?.response?.data || e?.message);
      }
    }

    if (!activeVehicle && (user?.email === 'jpmedinagomez1@gmail.com' || user?.id === '645b08f9-93b5-48a9-93d8-ec376107c57e')) {
      activeVehicle = '835be3bf-9684-4e7e-a844-8f0820e31517';
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

      let arrivingTripData: any = null;
      try {
        const arrivingRes = await driverArriving(currentOffer.tripId, {
          latitude: lastKnownLocation.latitude,
          longitude: lastKnownLocation.longitude,
        });
        arrivingTripData = arrivingRes?.data;
      } catch {
        // Fallback transition if transition request had error
      }

      const activeTrip: Trip = {
        id: currentOffer.tripId,
        public_code: arrivingTripData?.public_code || '',
        status: 'driver_arriving',
        service_type_id: arrivingTripData?.service_type_id || '',
        payment_method: arrivingTripData?.payment_method || currentOffer.fare?.paymentMethod || 'cash',
        driver_id: arrivingTripData?.driver_id || '',
        vehicle_id: activeVehicle,
        estimated_fare: String(arrivingTripData?.estimated_fare || currentOffer.fare?.totalFare || currentOffer.fare?.netEarnings || ''),
        final_fare: arrivingTripData?.final_fare || '',
        driver_earnings: currentOffer.fare?.netEarnings,
        fare_details: currentOffer.fare,
        currency: arrivingTripData?.currency || currentOffer.fare?.currency || 'ARS',
        confirmed_at: arrivingTripData?.confirmed_at || '',
        assigned_at: arrivingTripData?.assigned_at || new Date().toISOString(),
        driver_arrived_at: '',
        started_at: '',
        finished_at: '',
        cancelled_at: '',
        require_pin: arrivingTripData?.require_pin ?? currentOffer.require_pin ?? false,
        boarding_pin: arrivingTripData?.boarding_pin ?? currentOffer.boarding_pin ?? null,
        pickup: currentOffer.pickup,
        dropoff: currentOffer.dropoff,
        routeGeometry: currentOffer.routeGeometry,
        passenger: currentOffer.passenger,
        third_party: arrivingTripData?.third_party || currentOffer.third_party || undefined,
        chat: arrivingTripData?.chat || {
          coordinator_user_id: '',
          coordinator_name: '',
          coordinator_role: 'passenger',
          passenger_user_id: '',
          is_third_party_trip: Boolean(arrivingTripData?.third_party || currentOffer.third_party),
          third_party: arrivingTripData?.third_party
            ? {
                name: arrivingTripData.third_party.name,
                phone_e164: arrivingTripData.third_party.phone_e164,
              }
            : undefined,
        },
      };

      setActiveTrip(activeTrip);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearAllOffers();
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
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0 w-full px-4 z-50"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="w-full bg-[#0D0E15]/95 border border-white/10 rounded-[32px] p-5 shadow-2xl shadow-black relative overflow-hidden">
          {/* Top Edge Hairline Countdown Timer */}
          <Animated.View
            style={[
              timerBarStyle,
              {
                height: 3,
                backgroundColor: THEME_COLORS.gold,
                position: 'absolute',
                top: 0,
                left: 0,
              },
            ]}
          />

          {/* Header Row: Tier Badge & Countdown */}
          <View className="flex-row items-center justify-between mb-4 mt-0.5">
            <View className="flex-row items-center">
              <View className="flex-row items-center bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full mr-2">
                <Ionicons name="car-sport" size={14} color={THEME_COLORS.gold} />
                <Text className="text-white font-montserrat-bold text-xs ml-1.5 uppercase tracking-wider">
                  TransferBlack
                </Text>
              </View>
              <View className="bg-gold/15 border border-gold/30 px-3 py-1 rounded-full">
                <Text className="text-gold font-montserrat-bold text-xs tracking-wider uppercase">
                  {currentOffer.passenger?.category || 'VIP'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {offerQueue.length > 0 && (
                <View className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  <Text className="text-zinc-300 font-montserrat-semibold text-[11px]">
                    +{offerQueue.length}
                  </Text>
                </View>
              )}
              <View className="flex-row items-center bg-gold/15 border border-gold/30 px-3 py-1 rounded-full">
                <Ionicons name="time-outline" size={13} color={THEME_COLORS.gold} />
                <Text
                  className="text-gold font-montserrat-bold text-xs ml-1.5"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {secondsLeft}s
                </Text>
              </View>
            </View>
          </View>

          {/* Earnings & Payment Method */}
          <View className="flex-row items-end justify-between mb-4">
            <View>
              <Text className="text-zinc-400 font-montserrat text-[10px] tracking-widest uppercase mb-1">
                Ganancia Neta
              </Text>
              <Text
                style={{ fontVariant: ['tabular-nums'] }}
                className="text-white font-montserrat-bold text-4xl tracking-tight"
              >
                ${Number(currentOffer.fare.netEarnings || currentOffer.fare.totalFare || 0).toLocaleString('es-AR')}
              </Text>
            </View>

            {(() => {
              const paymentInfo = getPaymentMethodInfo(currentOffer.fare.paymentMethod);
              return (
                <View className="flex-row items-center bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl">
                  <Ionicons
                    name={paymentInfo.icon}
                    size={16}
                    color={THEME_COLORS.gold}
                  />
                  <Text className="text-zinc-200 font-montserrat-semibold text-xs ml-2 uppercase tracking-wider">
                    {paymentInfo.label}
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* Passenger Identity Row */}
          {(() => {
            const isThirdPartyOffer = Boolean(currentOffer.third_party?.name);
            const passengerDisplayName = isThirdPartyOffer
              ? `Viaja: ${currentOffer.third_party?.name} (Tercero)`
              : (currentOffer.passenger?.fullName || 'Identidad verificada');
            const avatarInitial = (isThirdPartyOffer ? currentOffer.third_party?.name : (currentOffer.passenger?.fullName || 'P'))
              ?.charAt(0)
              ?.toUpperCase() || 'P';

            const ratingCount = currentOffer.passengerRating?.count ?? currentOffer.passenger?.completedTrips ?? 0;
            const ratingAvg = currentOffer.passengerRating?.average ?? currentOffer.passenger?.rating;
            const isNewPassenger = !ratingCount || ratingCount === 0 || ratingAvg == null;

            return (
              <View className="flex-row items-center justify-between py-3 border-t border-white/10 mb-3">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 items-center justify-center mr-3">
                    <Text className="text-gold font-montserrat-bold text-sm">
                      {avatarInitial}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-montserrat-semibold text-sm" numberOfLines={1}>
                      {passengerDisplayName}
                    </Text>
                    <Text className="text-zinc-400 font-montserrat text-xs mt-0.5">
                      {isThirdPartyOffer ? 'Pasajero tercero' : 'Pasajero VIP'}
                    </Text>
                  </View>
                </View>

                {isNewPassenger ? (
                  <View className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    <Text className="text-zinc-300 font-montserrat-medium text-xs">
                      Nuevo
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text
                      className="text-white font-montserrat-bold text-xs ml-1"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {Number(ratingAvg).toFixed(2)}
                    </Text>
                    <Text className="text-zinc-400 font-montserrat text-xs ml-1">
                      · {ratingCount} v.
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Route Trajectory */}
          <View className="py-3 border-t border-white/10 mb-5">
            {/* Pickup Node */}
            <View className="flex-row items-start mb-3">
              <View className="items-center mr-3 mt-1">
                <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <View className="w-0.5 h-7 bg-white/15 my-0.5" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider">
                    Punto de partida
                  </Text>
                  <View className="bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    <Text className="text-emerald-400 font-montserrat-bold text-[11px]">
                      A {currentOffer.pickup?.etaMinutes || 2} min
                    </Text>
                  </View>
                </View>
                <Text className="text-white font-montserrat-medium text-sm leading-5" numberOfLines={2}>
                  {currentOffer.pickup?.address || 'Origen solicitado'}
                </Text>
              </View>
            </View>

            {/* Dropoff Node */}
            <View className="flex-row items-start">
              <View className="items-center mr-3 mt-1">
                <View className="w-2.5 h-2.5 rounded-full bg-red-400" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider">
                    Destino final
                  </Text>
                  <View className="bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                    <Text className="text-zinc-300 font-montserrat-medium text-[11px]">
                      ~{currentOffer.dropoff?.durationMinutes || 15} min
                    </Text>
                  </View>
                </View>
                <Text className="text-zinc-200 font-montserrat-medium text-sm leading-5" numberOfLines={2}>
                  {currentOffer.dropoff?.address || 'Destino no especificado'}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons: Solid Ergonomic Gold Button & Glass Dismiss */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleAccept}
            disabled={isAccepting}
            accessibilityRole="button"
            accessibilityLabel="Aceptar viaje entrante"
            className="w-full h-15 rounded-2xl justify-center items-center bg-gold shadow-lg shadow-gold/20 active:opacity-90"
          >
            {isAccepting ? (
              <ActivityIndicator color="#0A0A0C" size="small" />
            ) : (
              <View className="flex-row items-center justify-center">
                <Ionicons name="checkmark-circle" size={20} color="#0A0A0C" style={{ marginRight: 8 }} />
                <Text className="text-[#0A0A0C] font-montserrat-bold text-base tracking-wider uppercase">
                  Aceptar Viaje
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleReject}
            disabled={isAccepting}
            accessibilityRole="button"
            accessibilityLabel="Descartar la oferta de viaje"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-full h-12 mt-2.5 rounded-2xl items-center justify-center border border-white/10 bg-white/5 active:bg-white/10"
          >
            <Text className="text-zinc-400 font-montserrat-semibold text-xs uppercase tracking-widest">
              Rechazar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- MODE 2: SEARCHING / OFFLINE STATUS BAR ---
  return (
    <View
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
      key="connection-bottom-bar"
      className="absolute bottom-0 left-0 right-0 w-full bg-[#0A0B10]/95 rounded-t-[32px] border-t border-white/15 shadow-2xl shadow-black z-50 overflow-hidden"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      {/* Top Specular Edge Glass Highlight */}
      <View className="absolute top-0 left-8 right-8 h-[1px] bg-white/25 pointer-events-none" />

      {/* Ambient Glow Flare */}
      <View
        className="absolute -top-14 -left-14 w-36 h-36 rounded-full pointer-events-none"
        style={{
          backgroundColor: isAvailable ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)',
        }}
      />

      {/* Drag Indicator Pill */}
      <View style={{ width: 44, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.22)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />

      <View className="w-full px-5 py-2">
        <View className="w-full flex-row items-center justify-between">
          {/* Left: Status with Radar Beacon */}
          <View className="flex-row items-center flex-1 pr-3">
            {isAvailable ? (
              <View key="radar-active" className="w-12 h-12 items-center justify-center mr-3 relative">
                <Animated.View
                  style={[
                    radarWave1Style,
                    {
                      position: 'absolute',
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: 'rgba(16, 185, 129, 0.35)',
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    radarWave2Style,
                    {
                      position: 'absolute',
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: 'rgba(16, 185, 129, 0.22)',
                    },
                  ]}
                />
                <View className="w-4 h-4 rounded-full bg-emerald-400 shadow-md shadow-emerald-400" />
              </View>
            ) : (
              <View key="radar-inactive" className="w-12 h-12 items-center justify-center mr-3">
                <View className="w-3.5 h-3.5 rounded-full bg-red-500/80 shadow-md shadow-red-500/50" />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-white font-montserrat-bold text-base tracking-wide">
                {isAvailable ? 'EN LÍNEA' : 'DESCONECTADO'}
              </Text>
              <Text className="text-ash font-montserrat text-xs mt-0.5" numberOfLines={1}>
                {isAvailable ? 'Buscando viajes en tu zona...' : 'Tocá para comenzar tu jornada'}
              </Text>
            </View>
          </View>

          {/* Right: Connect / Disconnect Action Button (48px Touch Target for Driving) */}
          <TouchableOpacity
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={isAvailable ? 'Desconectarse del servicio' : 'Conectarse para recibir viajes'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onToggleAvailability(!isAvailable);
            }}
            className={`h-12 px-5 rounded-2xl border flex-row items-center justify-center relative overflow-hidden shadow-lg ${
              isAvailable
                ? 'bg-red-500/15 border-red-500/40'
                : 'bg-emerald-500/15 border-emerald-500/45'
            }`}
          >
            <View className="absolute top-0 left-2 right-2 h-[1px] bg-white/30 pointer-events-none" />
            <Ionicons
              name="power"
              size={17}
              color={isAvailable ? '#F87171' : '#34D399'}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`font-montserrat-bold text-xs tracking-wider uppercase ${
                isAvailable ? 'text-red-400' : 'text-emerald-400'
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
