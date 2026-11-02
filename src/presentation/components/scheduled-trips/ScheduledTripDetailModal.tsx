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
import { AmbientGlow } from '../ui/AmbientGlow';

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
  const passengerName =
    isThirdParty && rawThirdPartyName
      ? `Viaja: ${rawThirdPartyName}`
      : tripDetail?.passenger?.fullName || 'Pasajero Ejecutivo';
  const passengerPhone =
    isThirdParty && rawThirdPartyPhone
      ? rawThirdPartyPhone
      : tripDetail?.passenger?.phone || '';

  const formatScheduledDate = (dateStr?: string | null): string => {
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
      return `${datePart.charAt(0).toUpperCase() + datePart.slice(1)} · ${timePart} hs`;
    } catch {
      return dateStr;
    }
  };

  const handleCall = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (passengerPhone) {
      void Linking.openURL(`tel:${passengerPhone}`);
    } else {
      Alert.alert('Contacto', 'El número de teléfono no está disponible.');
    }
  };

  const handleClose = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View className="flex-1 bg-obsidian">
        <AmbientGlow color="#D4AF37" position="top" height={300} opacity={0.16} />
        <SafeAreaView className="flex-1">
          {/* Top Header Bar */}
          <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-white/10">
            <View className="flex-row items-center flex-1 mr-3">
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar detalle"
                className="w-11 h-11 rounded-2xl bg-[#13141E] border border-gold/40 items-center justify-center mr-3.5 active:scale-95"
              >
                <Ionicons name="close" size={22} color={THEME_COLORS.gold} />
              </TouchableOpacity>
              <View>
                <Text className="text-gold font-montserrat-bold text-[10px] uppercase tracking-widest mb-0.5">
                  FICHA DE TRASLADO
                </Text>
                <Text className="text-white font-montserrat-bold text-lg">
                  Detalle de Reserva
                </Text>
                {tripDetail?.public_code && (
                  <Text className="text-ash font-montserrat text-xs">
                    Código #{tripDetail.public_code}
                  </Text>
                )}
              </View>
            </View>

            <View className="bg-gold/15 border border-gold/45 px-3 py-1.5 rounded-full flex-row items-center">
              <Ionicons name="diamond" size={11} color={THEME_COLORS.gold} style={{ marginRight: 5 }} />
              <Text className="text-gold font-montserrat-bold text-[10px] uppercase tracking-wider">
                VIP
              </Text>
            </View>
          </View>

          {/* Content Body */}
          {isLoading ? (
            <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
              <SkeletonBox className="w-full h-20 rounded-3xl mb-4" />
              <SkeletonBox className="w-full h-24 rounded-3xl mb-4" />
              <SkeletonBox className="w-full h-36 rounded-3xl mb-4" />
              <SkeletonBox className="w-full h-28 rounded-3xl mb-4" />
            </ScrollView>
          ) : errorMessage ? (
            <View className="flex-1 items-center justify-center px-6">
              <View className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-500/40 items-center justify-center mb-4">
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
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    void refetch();
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
            <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
              {/* Unified Executive Trip Canvas */}
              <LiquidGlassContainer
                variant="gold"
                className="rounded-[28px] p-5 mb-5 border border-gold/35"
              >
                {/* Scheduled Date Section */}
                <View className="flex-row items-center pb-4 mb-4 border-b border-white/10">
                  <View className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/40 items-center justify-center mr-3.5">
                    <Ionicons name="calendar" size={22} color={THEME_COLORS.gold} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gold/80 font-montserrat-bold text-[10px] uppercase tracking-widest mb-0.5">
                      FECHA Y HORA PROGRAMADA
                    </Text>
                    <Text className="text-white font-montserrat-bold text-base">
                      {formatScheduledDate(tripDetail.confirmed_at || tripDetail.assigned_at)}
                    </Text>
                  </View>
                </View>

                {/* Passenger / Third Party Row */}
                <View className="flex-row items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 mb-4">
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/45 items-center justify-center mr-3.5">
                      <Text className="text-gold font-montserrat-bold text-lg">
                        {(rawThirdPartyName || tripDetail.passenger?.fullName || 'P')
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-montserrat-bold text-base" numberOfLines={1}>
                        {passengerName}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        <Ionicons name="shield-checkmark" size={12} color={THEME_COLORS.gold} />
                        <Text className="text-gold font-montserrat-semibold text-[11px] ml-1">
                          {isThirdParty ? 'Pasajero Invitado VIP' : 'TransferBlack Executive'}
                        </Text>
                      </View>
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
                      className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/40 items-center justify-center active:scale-95"
                    >
                      <Ionicons name="call" size={18} color={THEME_COLORS.gold} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Route Trajectory */}
                <View className="pb-4 mb-4 border-b border-white/10 px-1">
                  <Text className="text-ash font-montserrat-bold text-[10px] uppercase tracking-widest mb-3">
                    ITINERARIO EJECUTIVO
                  </Text>

                  {/* Pickup Point */}
                  <View className="flex-row items-start">
                    <View className="items-center mr-3.5 pt-0.5">
                      <View className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-400/50 items-center justify-center">
                        <View className="w-2 h-2 rounded-full bg-emerald-400" />
                      </View>
                      <View className="w-[1.5px] h-7 bg-white/15 my-1" />
                    </View>
                    <View className="flex-1 pb-2">
                      <Text className="text-emerald-400 font-montserrat-bold text-[9px] uppercase tracking-widest mb-0.5">
                        PUNTO DE PARTIDA
                      </Text>
                      <Text className="text-white font-montserrat-semibold text-sm leading-5">
                        {tripDetail.pickup?.address || 'Ubicación de recogida'}
                      </Text>
                    </View>
                  </View>

                  {/* Dropoff Point */}
                  <View className="flex-row items-start">
                    <View className="items-center mr-3.5 pt-0.5">
                      <View className="w-6 h-6 rounded-full bg-gold/15 border border-gold/50 items-center justify-center">
                        <Ionicons name="location" size={13} color={THEME_COLORS.gold} />
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gold font-montserrat-bold text-[9px] uppercase tracking-widest mb-0.5">
                        DESTINO FINAL
                      </Text>
                      <Text className="text-white font-montserrat-semibold text-sm leading-5">
                        {tripDetail.dropoff?.address || 'Ubicación de destino'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Financial Summary */}
                <View>
                  <Text className="text-ash font-montserrat-bold text-[10px] uppercase tracking-widest mb-2.5">
                    LIQUIDACIÓN ESTIMADA DEL SERVICIO
                  </Text>

                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-ash font-montserrat text-xs">Tarifa total del viaje</Text>
                    <Text
                      className="text-white font-montserrat-semibold text-xs"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      ${Number(tripDetail.final_fare || tripDetail.estimated_fare || 0).toLocaleString('es-AR')} {tripDetail.currency || 'ARS'}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
                    <Text className="text-platinum font-montserrat-bold text-xs uppercase tracking-wider">
                      Tu ganancia neta
                    </Text>
                    <Text
                      className="text-gold font-montserrat-bold text-2xl"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      ${Number(
                        tripDetail.driver_earnings ||
                          tripDetail.fare_details?.netEarnings ||
                          Math.round(Number(tripDetail.estimated_fare || 0) * 0.8)
                      ).toLocaleString('es-AR')}{' '}
                      <Text className="text-xs font-montserrat-semibold">{tripDetail.currency || 'ARS'}</Text>
                    </Text>
                  </View>
                </View>
              </LiquidGlassContainer>

              {/* Operational Advisory Pill */}
              <View className="rounded-2xl p-4 mb-6 flex-row items-start bg-gold/10 border border-gold/30">
                <Ionicons name="shield-checkmark-outline" size={20} color={THEME_COLORS.gold} />
                <View className="flex-1 ml-3">
                  <Text className="text-gold font-montserrat-bold text-xs mb-1 uppercase tracking-wider">
                    Protocolo de Puntualidad VIP
                  </Text>
                  <Text className="text-ash font-montserrat text-xs leading-5">
                    El despacho activará tu hoja de ruta automáticamente 20 minutos antes de la hora pactada. Mantené tu estado En Línea para confirmar recepción.
                  </Text>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={handleClose}
                className="w-full h-14 rounded-2xl items-center justify-center bg-gold active:opacity-90 mb-8 shadow-lg shadow-gold/25"
                accessibilityRole="button"
                accessibilityLabel="Cerrar detalle"
              >
                <Text className="font-montserrat-bold text-xs text-obsidian tracking-widest uppercase">
                  ENTENDIDO · VOLVER A AGENDA
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
};
