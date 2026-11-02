import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
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
import { acceptTripOffer, driverArriving } from '../../../core/trip/actions/trip.actions';
import { Trip } from '../../../core/trip/interface/trip.interface';
import { useLocationStore } from '../../maps/store/useLocationStore';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { AmbientGlow } from '../ui/AmbientGlow';
import { offerAlarmService } from '../../trip/services/offerAlarmService';
import { useDriverStatusStore } from '../../driver/store/useDriverStatusStore';
import { DocumentExpirationBlockModal } from '../compliance/DocumentExpirationBlockModal';
import { TermsAcceptanceModal } from '../legal/TermsAcceptanceModal';
import { useLegalStore } from '../../legal/store/useLegalStore';
import { TripOfferCard } from '../trip/TripOfferCard';

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
  const dispatchSuspendedUntil = useDriverStatusStore((state) => state.dispatchSuspendedUntil);
  const compliance = useDriverStatusStore((state) => state.compliance);
  const hasAcceptedCurrentTerms = useLegalStore((state) => state.hasAcceptedCurrentTerms);

  const [isDocBlockModalVisible, setIsDocBlockModalVisible] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    if (!dispatchSuspendedUntil) {
      return;
    }

    const checkSuspended = () => {
      setIsSuspended(new Date(dispatchSuspendedUntil).getTime() > Date.now());
    };

    const timer = setTimeout(checkSuspended, 0);
    const interval = setInterval(checkSuspended, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [dispatchSuspendedUntil]);

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
        }
      } catch (err: any) {
        console.warn('Could not load vehicle from /driver/me:', err?.response?.data || err?.message);
      }
    };

    fetchVehicle();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

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

  // Manejo de sonido/alerta chill al recibir u ocultar oferta
  useEffect(() => {
    if (currentOffer) {
      void offerAlarmService.start();
    } else {
      void offerAlarmService.stop();
    }
    return () => {
      void offerAlarmService.stop();
    };
  }, [currentOffer]);

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
        if (activeVehicle) {
          setVehicleId(activeVehicle);
        }
      } catch (e: any) {
        console.warn('Error fetching vehicle on accept:', e?.response?.data || e?.message);
      }
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
      void offerAlarmService.stop();
      clearAllOffers();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Aviso', error.message);
      void offerAlarmService.stop();
      clearOffer();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void offerAlarmService.stop();
    clearOffer();
  };

  // --- MODE 1: TRIP OFFER DOCKED LIQUID GLASS PANEL ---
  if (currentOffer) {
    return (
      <TripOfferCard
        offer={currentOffer}
        queueCount={offerQueue.length}
        onAccept={handleAccept}
        onReject={handleReject}
        isAccepting={isAccepting}
        onHeightChange={onHeightChange}
        bottomInset={insets.bottom}
      />
    );
  }

  // --- MODE 2: SEARCHING / OFFLINE STATUS BAR ---
  return (
    <View
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
      key="connection-bottom-bar"
      className={`absolute bottom-0 left-0 right-0 w-full bg-[#090A0F]/96 rounded-t-[32px] border-t shadow-2xl shadow-black z-50 overflow-hidden ${
        isAvailable
          ? isSuspended
            ? 'border-amber-500/40'
            : 'border-emerald-500/40'
          : 'border-gold/45'
      }`}
      style={{ paddingBottom: Math.max(insets.bottom, 18) }}
    >
      {/* Top Specular Edge Glass Highlight */}
      <View
        className={`absolute top-0 left-10 right-10 h-[1px] pointer-events-none ${
          isAvailable
            ? isSuspended
              ? 'bg-amber-400/50'
              : 'bg-emerald-400/50'
            : 'bg-gold/55'
        }`}
      />

      {/* Ambient Glow Flare */}
      <AmbientGlow
        position="top-left"
        height={200}
        opacity={0.18}
        color={isAvailable ? (isSuspended ? '#F59E0B' : '#10B981') : '#D4AF37'}
      />

      {/* Drag Indicator Pill */}
      <View className="w-11 h-1 rounded-full bg-white/25 self-center mt-2.5 mb-2" />

      <View className="w-full px-5 py-2">
        <View className="w-full flex-row items-center justify-between">
          {/* Left: Status with Radar Beacon or Executive Emblem */}
          <View className="flex-row items-center flex-1 pr-3">
            {isAvailable ? (
              <View key="radar-active" className="w-13 h-13 w-[50px] h-[50px] items-center justify-center mr-3.5 relative">
                <Animated.View
                  style={[
                    radarWave1Style,
                    {
                      position: 'absolute',
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: isSuspended
                        ? 'rgba(245, 158, 11, 0.35)'
                        : 'rgba(16, 185, 129, 0.35)',
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    radarWave2Style,
                    {
                      position: 'absolute',
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: isSuspended
                        ? 'rgba(245, 158, 11, 0.22)'
                        : 'rgba(16, 185, 129, 0.22)',
                    },
                  ]}
                />
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center border ${
                    isSuspended
                      ? 'bg-amber-500/20 border-amber-400'
                      : 'bg-emerald-500/20 border-emerald-400'
                  }`}
                >
                  <Ionicons
                    name="radio"
                    size={16}
                    color={isSuspended ? '#FBBF24' : '#34D399'}
                  />
                </View>
              </View>
            ) : (
              <View
                key="radar-inactive"
                className="w-[50px] h-[50px] rounded-2xl bg-gold/15 border border-gold/40 items-center justify-center mr-3.5 shadow-md shadow-black"
              >
                <Ionicons name="car-sport" size={22} color="#D4AF37" />
              </View>
            )}

            <View className="flex-1">
              <Text
                className={`font-montserrat-bold text-[9px] uppercase tracking-widest mb-0.5 ${
                  isAvailable
                    ? isSuspended
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                    : 'text-gold'
                }`}
              >
                {isAvailable
                  ? isSuspended
                    ? 'DESPACHO EN PAUSA'
                    : 'RADAR EJECUTIVO ACTIVO'
                  : 'CENTRAL TRANSFERBLACK'}
              </Text>
              <Text className="text-white font-montserrat-bold text-base tracking-wide">
                {isAvailable ? (isSuspended ? 'EN LÍNEA (PAUSADO)' : 'EN LÍNEA') : 'DESCONECTADO'}
              </Text>
              <Text className="text-ash font-montserrat text-xs mt-0.5" numberOfLines={1}>
                {isAvailable
                  ? isSuspended
                    ? 'Despacho pausado por cancelaciones'
                    : 'Prioridad activa para solicitudes VIP...'
                  : 'Conectate para recibir viajes exclusivos'}
              </Text>
            </View>
          </View>

          {/* Right: Connect / Disconnect Executive Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isAvailable ? 'Desconectarse del servicio' : 'Conectarse para recibir viajes'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (!isAvailable && compliance.status === 'suspended_documents') {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setIsDocBlockModalVisible(true);
                return;
              }
              if (!isAvailable && !hasAcceptedCurrentTerms()) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setIsTermsModalVisible(true);
                return;
              }
              if (!isAvailable && isSuspended) {
                Alert.alert(
                  'Despacho Pausado',
                  'Estarás en línea, pero no recibirás ofertas hasta que expire la pausa de 15 minutos.'
                );
              }
              onToggleAvailability(!isAvailable);
            }}
            className={`h-12 px-5 rounded-2xl border flex-row items-center justify-center relative overflow-hidden shadow-lg ${
              isAvailable
                ? 'bg-red-500/15 border-red-500/45 shadow-black'
                : 'bg-gold border-gold shadow-gold/25'
            }`}
          >
            <View className="absolute top-0 left-2 right-2 h-[1px] bg-white/35 pointer-events-none" />
            <Ionicons
              name="power"
              size={17}
              color={isAvailable ? '#F87171' : '#0A0A0C'}
              style={{ marginRight: 7 }}
            />
            <Text
              className={`font-montserrat-bold text-xs tracking-wider uppercase ${
                isAvailable ? 'text-red-400' : 'text-obsidian'
              }`}
            >
              {isAvailable ? 'Desconectar' : 'Conectar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal bloqueante por documentación vencida */}
      <DocumentExpirationBlockModal
        visible={isDocBlockModalVisible}
        onClose={() => setIsDocBlockModalVisible(false)}
      />

      {/* Modal de aceptación obligatoria de Términos y Condiciones */}
      <TermsAcceptanceModal
        visible={isTermsModalVisible}
        onClose={() => setIsTermsModalVisible(false)}
        onAccepted={() => onToggleAvailability(true)}
      />
    </View>
  );
};
