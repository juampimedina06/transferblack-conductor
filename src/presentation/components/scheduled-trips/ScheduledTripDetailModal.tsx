import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getTripById } from '../../../core/trip/actions/trip.actions';
import { THEME_COLORS } from '../../../core/constants/theme';
import { SkeletonBox } from '@/presentation/components/ui/SkeletonBox';

interface ScheduledTripDetailModalProps {
  tripId: string | null;
  visible: boolean;
  onClose: () => void;
}

export const ScheduledTripDetailModal = ({
  tripId,
  visible,
  onClose,
}: ScheduledTripDetailModalProps) => {
  const {
    data: tripDetail,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['scheduled-trip', 'detail', tripId],
    queryFn: () => getTripById(tripId!),
    enabled: Boolean(visible && tripId),
    retry: 1,
  });

  const errorMessage = error
    ? (error as any).status === 403
      ? 'No tienes permiso para consultar el detalle de este viaje programado.'
      : (error as any).message || 'No se pudo cargar la información del viaje. Intenta nuevamente.'
    : null;

  const rawThirdPartyName =
    tripDetail?.thirdPartyName ||
    tripDetail?.third_party?.name ||
    tripDetail?.chat?.third_party?.name;
  const rawThirdPartyPhone =
    tripDetail?.thirdPartyPhone ||
    tripDetail?.third_party?.phone_e164 ||
    tripDetail?.chat?.third_party?.phone_e164;

  const isThirdParty = Boolean(rawThirdPartyName || tripDetail?.chat?.is_third_party_trip);
  const passengerName = isThirdParty && rawThirdPartyName
    ? `Viaja: ${rawThirdPartyName} (Tercero)`
    : (tripDetail?.passenger?.fullName || 'Pasajero');
  const passengerPhone = isThirdParty && rawThirdPartyPhone
    ? rawThirdPartyPhone
    : (tripDetail?.passenger?.phone || '');

  const formatScheduledDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Horario a confirmar';
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      const timePart = d.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${datePart.charAt(0).toUpperCase() + datePart.slice(1)} • ${timePart} hs`;
    } catch {
      return dateStr;
    }
  };

  const handleCall = () => {
    if (passengerPhone) {
      Linking.openURL(`tel:${passengerPhone}`);
    } else {
      Alert.alert('Contacto', 'El número de teléfono no está disponible.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-obsidian">
        {/* Top Header Bar */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-white/[0.08]">
          <View className="flex-row items-center flex-1 mr-3">
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar detalle"
              className="w-9 h-9 rounded-full bg-charcoal items-center justify-center border border-charcoal mr-3"
            >
              <Ionicons name="close" size={20} color={THEME_COLORS.platinum} />
            </TouchableOpacity>
            <View>
              <Text className="text-white font-montserrat-bold text-base">
                Detalle de Reserva
              </Text>
              {tripDetail?.public_code && (
                <Text className="text-zinc-400 font-montserrat text-[11px]">
                  Código: {tripDetail.public_code}
                </Text>
              )}
            </View>
          </View>

          <View className="bg-[#D4AF37]/15 border border-[#D4AF37]/35 px-3 py-1 rounded-full">
            <Text className="text-[#D4AF37] font-montserrat-semibold text-[11px] uppercase tracking-wider">
              Programado
            </Text>
          </View>
        </View>

        {/* Content Body */}
        {isLoading ? (
          <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
            <SkeletonBox className="w-full h-16 rounded-2xl mb-4" />
            <SkeletonBox className="w-full h-24 rounded-2xl mb-4" />
            <SkeletonBox className="w-full h-36 rounded-2xl mb-4" />
            <SkeletonBox className="w-full h-28 rounded-2xl mb-4" />
          </ScrollView>
        ) : errorMessage ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/40 items-center justify-center mb-4">
              <Ionicons name="alert-circle-outline" size={32} color="#F87171" />
            </View>
            <Text className="text-white font-montserrat-bold text-lg mb-2 text-center">
              No se pudo cargar el viaje
            </Text>
            <Text className="text-zinc-400 font-montserrat text-xs text-center mb-6 leading-5">
              {errorMessage}
            </Text>
            {tripId && (
              <TouchableOpacity
                onPress={() => refetch()}
                className="bg-gold px-6 py-3 rounded-full active:opacity-80"
              >
                <Text className="text-obsidian font-montserrat-bold text-xs tracking-wider uppercase">
                  Reintentar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : tripDetail ? (
          <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
            {/* Scheduled Date Banner */}
            <View className="bg-[#141417] border border-white/[0.08] rounded-2xl p-4 mb-4 flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 items-center justify-center mr-3">
                <Ionicons name="time" size={20} color={THEME_COLORS.gold} />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 font-montserrat text-[10px] uppercase tracking-wider mb-0.5">
                  Fecha y Hora programada
                </Text>
                <Text className="text-white font-montserrat-bold text-sm">
                  {formatScheduledDate(tripDetail.confirmed_at || tripDetail.assigned_at)}
                </Text>
              </View>
            </View>

            {/* Passenger / Third Party Card */}
            <View className="bg-[#141417] border border-white/[0.08] rounded-2xl p-4 mb-4">
              <Text className="text-zinc-400 font-montserrat-semibold text-[10px] uppercase tracking-wider mb-3">
                Información del Pasajero
              </Text>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-11 h-11 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 items-center justify-center mr-3">
                    <Text className="text-[#D4AF37] font-montserrat-bold text-base">
                      {(rawThirdPartyName || tripDetail.passenger?.fullName || 'P')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-montserrat-bold text-sm" numberOfLines={1}>
                      {passengerName}
                    </Text>
                    <Text className="text-[#D4AF37] font-montserrat-medium text-[11px] mt-0.5">
                      {isThirdParty ? 'Viaje para tercero' : 'TransferBlack VIP'}
                    </Text>
                    {passengerPhone ? (
                      <Text className="text-zinc-400 font-montserrat text-xs mt-0.5">
                        {passengerPhone}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {passengerPhone ? (
                  <TouchableOpacity
                    onPress={handleCall}
                    accessibilityRole="button"
                    accessibilityLabel={`Llamar a ${passengerName}`}
                    className="w-10 h-10 rounded-full bg-[#1E1E24] border border-zinc-700/80 items-center justify-center active:opacity-70"
                  >
                    <Ionicons name="call" size={17} color={THEME_COLORS.platinum} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Route Trajectory & Stops */}
            <View className="bg-[#141417] border border-white/[0.08] rounded-2xl p-4 mb-4">
              <Text className="text-zinc-400 font-montserrat-semibold text-[10px] uppercase tracking-wider mb-3">
                Itinerario del Viaje
              </Text>

              {/* Pickup Point */}
              <View className="flex-row items-start mb-3">
                <View className="items-center mr-3 mt-1">
                  <View className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <View className="w-0.5 h-8 bg-zinc-700 my-1" />
                </View>
                <View className="flex-1">
                  <Text className="text-emerald-400 font-montserrat-semibold text-[10px] uppercase tracking-wider mb-0.5">
                    Punto de Partida
                  </Text>
                  <Text className="text-white font-montserrat-medium text-xs leading-4">
                    {tripDetail.pickup?.address || 'Ubicación de recogida'}
                  </Text>
                </View>
              </View>

              {/* Dropoff Point */}
              <View className="flex-row items-start">
                <View className="items-center mr-3 mt-1">
                  <View className="w-3 h-3 rounded-full bg-red-400 shadow-sm shadow-red-400" />
                </View>
                <View className="flex-1">
                  <Text className="text-red-400 font-montserrat-semibold text-[10px] uppercase tracking-wider mb-0.5">
                    Destino Final
                  </Text>
                  <Text className="text-white font-montserrat-medium text-xs leading-4">
                    {tripDetail.dropoff?.address || 'Ubicación de destino'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Financial Summary */}
            <View className="bg-[#141417] border border-white/[0.08] rounded-2xl p-4 mb-4">
              <Text className="text-zinc-400 font-montserrat-semibold text-[10px] uppercase tracking-wider mb-3">
                Compensación Estimada
              </Text>

              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-zinc-400 font-montserrat text-xs">Tarifa total calculada</Text>
                <Text className="text-white font-montserrat-semibold text-xs">
                  ${Number(tripDetail.final_fare || tripDetail.estimated_fare || 0).toLocaleString('es-AR')} {tripDetail.currency || 'ARS'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between pt-2 border-t border-white/[0.06]">
                <Text className="text-zinc-300 font-montserrat-bold text-xs uppercase tracking-wider">
                  Tu ganancia neta estimada
                </Text>
                <Text className="text-[#D4AF37] font-montserrat-bold text-base">
                  ${Number(tripDetail.driver_earnings || tripDetail.fare_details?.netEarnings || Math.round(Number(tripDetail.estimated_fare || 0) * 0.8)).toLocaleString('es-AR')} {tripDetail.currency || 'ARS'}
                </Text>
              </View>
            </View>

            {/* Operational Warning Callout */}
            <View className="bg-amber-400/10 border border-amber-400/25 rounded-2xl p-4 mb-6 flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#EAB308" className="mr-3" />
              <View className="flex-1 ml-2.5">
                <Text className="text-amber-400 font-montserrat-semibold text-xs mb-1">
                  Activación de la Reserva
                </Text>
                <Text className="text-zinc-300 font-montserrat text-[11px] leading-4">
                  El sistema confirmará automáticamente tu asignación 20 minutos antes de la hora programada. Conéctate y mantente disponible para no perder la reserva.
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              className="w-full py-4 rounded-full items-center justify-center bg-white/[0.08] border border-white/10 active:opacity-70 mb-6"
            >
              <Text className="font-montserrat-bold text-sm text-white tracking-wider uppercase">
                Cerrar
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};
