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
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { getTripById } from '../../../core/trip/actions/trip.actions';
import { THEME_COLORS } from '../../../core/constants/theme';
import { SkeletonBox } from '@/presentation/components/ui/SkeletonBox';
import { LiquidGlassContainer } from '../ui/LiquidGlassContainer';

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (passengerPhone) {
      Linking.openURL(`tel:${passengerPhone}`);
    } else {
      Alert.alert('Contacto', 'El número de teléfono no está disponible.');
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-obsidian">
        {/* Top Header Bar */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
          <View className="flex-row items-center flex-1 mr-3">
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar detalle"
              className="w-11 h-11 rounded-full bg-white/5 border border-white/10 items-center justify-center mr-3 active:scale-95"
            >
              <Ionicons name="close" size={22} color={THEME_COLORS.gold} />
            </TouchableOpacity>
            <View>
              <Text className="text-white font-montserrat-bold text-base">
                Detalle de Reserva
              </Text>
              {tripDetail?.public_code && (
                <Text className="text-ash font-montserrat text-xs">
                  Código: {tripDetail.public_code}
                </Text>
              )}
            </View>
          </View>

          <View className="bg-gold/15 border border-gold/40 px-3 py-1 rounded-full">
            <Text className="text-gold font-montserrat-semibold text-[11px] uppercase tracking-wider">
              Programado
            </Text>
          </View>
        </View>

        {/* Content Body */}
        {isLoading ? (
          <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
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
            <Text className="text-ash font-montserrat text-xs text-center mb-6 leading-5">
              {errorMessage}
            </Text>
            {tripId && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  refetch();
                }}
                className="bg-gold px-6 py-3.5 rounded-2xl active:opacity-90 shadow-md shadow-gold/20"
              >
                <Text className="text-obsidian font-montserrat-bold text-xs tracking-wider uppercase">
                  Reintentar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : tripDetail ? (
          <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
            {/* Unified Trip Canvas */}
            <LiquidGlassContainer
              variant="default"
              className="rounded-3xl p-5 mb-5 border border-white/10"
            >
              {/* Scheduled Date Section */}
              <View className="flex-row items-center pb-4 mb-4 border-b border-white/10">
                <View className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/30 items-center justify-center mr-3.5">
                  <Ionicons name="time" size={22} color={THEME_COLORS.gold} />
                </View>
                <View className="flex-1">
                  <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider mb-0.5">
                    Fecha y Hora programada
                  </Text>
                  <Text className="text-white font-montserrat-bold text-base">
                    {formatScheduledDate(tripDetail.confirmed_at || tripDetail.assigned_at)}
                  </Text>
                </View>
              </View>

              {/* Passenger / Third Party Row */}
              <View className="flex-row items-center justify-between pb-4 mb-4 border-b border-white/10">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 items-center justify-center mr-3.5">
                    <Text className="text-gold font-montserrat-bold text-base">
                      {(rawThirdPartyName || tripDetail.passenger?.fullName || 'P')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-montserrat-bold text-sm" numberOfLines={1}>
                      {passengerName}
                    </Text>
                    <Text className="text-gold font-montserrat-medium text-[11px] mt-0.5">
                      {isThirdParty ? 'Viaje para tercero' : 'TransferBlack VIP'}
                    </Text>
                    {passengerPhone ? (
                      <Text className="text-ash font-montserrat text-xs mt-0.5">
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
                    className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 items-center justify-center active:scale-95"
                  >
                    <Ionicons name="call" size={18} color={THEME_COLORS.gold} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Route Trajectory */}
              <View className="pb-4 mb-4 border-b border-white/10">
                <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider mb-3">
                  Itinerario del Viaje
                </Text>

                {/* Pickup Point */}
                <View className="flex-row items-start mb-3">
                  <View className="items-center mr-3 mt-1">
                    <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <View className="w-0.5 h-6 bg-white/15 my-0.5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider mb-0.5">
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
                    <View className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider mb-0.5">
                      Destino Final
                    </Text>
                    <Text className="text-white font-montserrat-medium text-xs leading-4">
                      {tripDetail.dropoff?.address || 'Ubicación de destino'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Financial Summary */}
              <View>
                <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider mb-2.5">
                  Compensación Estimada
                </Text>

                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-ash font-montserrat text-xs">Tarifa total calculada</Text>
                  <Text
                    className="text-white font-montserrat-medium text-xs"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    ${Number(tripDetail.final_fare || tripDetail.estimated_fare || 0).toLocaleString('es-AR')} {tripDetail.currency || 'ARS'}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between pt-2.5 border-t border-white/10">
                  <Text className="text-platinum font-montserrat-bold text-xs uppercase tracking-wider">
                    Tu ganancia neta
                  </Text>
                  <Text
                    className="text-gold font-montserrat-bold text-xl"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    ${Number(tripDetail.driver_earnings || tripDetail.fare_details?.netEarnings || Math.round(Number(tripDetail.estimated_fare || 0) * 0.8)).toLocaleString('es-AR')} {tripDetail.currency || 'ARS'}
                  </Text>
                </View>
              </View>
            </LiquidGlassContainer>

            {/* Operational Advisory Pill */}
            <View className="rounded-2xl p-4 mb-6 flex-row items-start bg-amber-500/10 border border-amber-500/25">
              <Ionicons name="information-circle-outline" size={18} color="#EAB308" className="mt-0.5 mr-2.5" />
              <View className="flex-1 ml-2">
                <Text className="text-amber-400 font-montserrat-semibold text-xs mb-1">
                  Activación de la Reserva
                </Text>
                <Text className="text-ash font-montserrat text-xs leading-relaxed">
                  El sistema confirmará automáticamente tu asignación 20 minutos antes de la hora programada. Conéctate y mantente disponible para no perder la reserva.
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={handleClose}
              className="w-full h-14 rounded-2xl items-center justify-center bg-white/10 border border-white/15 active:bg-white/20 mb-6"
              accessibilityRole="button"
              accessibilityLabel="Cerrar detalle"
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

