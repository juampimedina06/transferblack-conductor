import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DriverScheduledTrip } from '../../../core/trip/interface/trip.interface';
import { THEME_COLORS } from '../../../core/constants/theme';
import { LiquidGlassContainer } from '../ui/LiquidGlassContainer';

interface ScheduledTripCardProps {
  trip: DriverScheduledTrip;
  onPress: (trip: DriverScheduledTrip) => void;
}

export const ScheduledTripCard = ({ trip, onPress }: ScheduledTripCardProps) => {
  const isThirdParty = Boolean(trip.thirdPartyName);
  const passengerName = isThirdParty
    ? `Viaja: ${trip.thirdPartyName}`
    : trip.passenger?.firstName || 'Pasajero Ejecutivo';
  const passengerPhone = isThirdParty
    ? trip.thirdPartyPhone || ''
    : trip.passenger?.phone || '';
  const initialLetter = (
    trip.thirdPartyName ||
    trip.passenger?.firstName ||
    'P'
  )
    .charAt(0)
    .toUpperCase();

  const formatScheduledDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
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

  const handleCall = (e: any): void => {
    e.stopPropagation?.();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (passengerPhone) {
      void Linking.openURL(`tel:${passengerPhone}`);
    } else {
      Alert.alert('Contacto', 'El número de teléfono no está disponible.');
    }
  };

  const handleCardPress = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(trip);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={handleCardPress}
      className="w-full mb-4"
      accessibilityRole="button"
      accessibilityLabel={`Reserva para ${passengerName}, fecha ${formatScheduledDate(trip.scheduledAt)}`}
    >
      <LiquidGlassContainer
        variant={trip.isRecurring ? 'gold' : 'elevated'}
        className="rounded-[28px] p-5 border border-white/15"
      >
        {/* Left Accent Strip for VIP Boarding Pass feel */}
        <View
          pointerEvents="none"
          className={`absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full ${
            trip.isRecurring ? 'bg-gold' : 'bg-emerald-400'
          }`}
        />

        {/* Top Header: Schedule Date & VIP Service Tier Badge */}
        <View className="flex-row items-center justify-between mb-3.5 pb-3 border-b border-white/10">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/40 items-center justify-center mr-3">
              <Ionicons name="calendar" size={16} color={THEME_COLORS.gold} />
            </View>
            <View className="flex-1">
              <Text className="text-gold/80 font-montserrat-bold text-[9px] uppercase tracking-widest mb-0.5">
                HORARIO PROGRAMADO
              </Text>
              <Text className="text-white font-montserrat-bold text-sm" numberOfLines={1}>
                {formatScheduledDate(trip.scheduledAt)}
              </Text>
            </View>
          </View>

          {/* Badge Abono Corporativo vs Reserva VIP */}
          <View
            className={`flex-row items-center px-3 py-1.5 rounded-full border ${
              trip.isRecurring
                ? 'bg-gold/15 border-gold/45'
                : 'bg-white/[0.08] border-white/20'
            }`}
          >
            <Ionicons
              name={trip.isRecurring ? 'repeat' : 'diamond-outline'}
              size={11}
              color={trip.isRecurring ? THEME_COLORS.gold : '#FFFFFF'}
              style={{ marginRight: 5 }}
            />
            <Text
              className={`font-montserrat-bold text-[10px] tracking-wider uppercase ${
                trip.isRecurring ? 'text-gold' : 'text-white'
              }`}
            >
              {trip.isRecurring ? 'Abono VIP' : 'Puntual'}
            </Text>
          </View>
        </View>

        {/* Passenger Chamber with Monogram & Direct Call */}
        <View className="flex-row items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl p-3 mb-4">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/45 items-center justify-center mr-3">
              <Text className="text-gold font-montserrat-bold text-base">
                {initialLetter}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-montserrat-bold text-sm" numberOfLines={1}>
                {passengerName}
              </Text>
              <View className="flex-row items-center mt-1">
                <View className="flex-row items-center bg-gold/15 border border-gold/30 px-2 py-0.5 rounded-md mr-2">
                  <Ionicons
                    name={isThirdParty ? 'people' : 'shield-checkmark'}
                    size={10}
                    color={THEME_COLORS.gold}
                  />
                  <Text className="text-gold font-montserrat-bold text-[9px] uppercase tracking-wider ml-1">
                    {isThirdParty ? 'Invitado VIP' : 'TransferBlack Executive'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {passengerPhone ? (
            <TouchableOpacity
              onPress={handleCall}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Llamar a ${passengerName}`}
              className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/40 items-center justify-center active:opacity-80"
            >
              <Ionicons name="call" size={17} color={THEME_COLORS.gold} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Connected Route Trajectory Timeline */}
        <View className="mb-4 px-1">
          {/* Origen */}
          <View className="flex-row items-start">
            <View className="items-center mr-3.5 pt-0.5">
              <View className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-400/50 items-center justify-center">
                <View className="w-2 h-2 rounded-full bg-emerald-400" />
              </View>
              <View className="w-[1.5px] h-6 bg-white/15 my-1" />
            </View>
            <View className="flex-1 pb-2">
              <Text className="text-ash font-montserrat-bold text-[9px] uppercase tracking-widest mb-0.5">
                PUNTO DE PARTIDA
              </Text>
              <Text className="text-white font-montserrat-semibold text-sm leading-5" numberOfLines={1}>
                {trip.origin?.address || 'Ubicación de partida'}
              </Text>
            </View>
          </View>

          {/* Destino */}
          <View className="flex-row items-start">
            <View className="items-center mr-3.5 pt-0.5">
              <View className="w-6 h-6 rounded-full bg-gold/15 border border-gold/50 items-center justify-center">
                <Ionicons name="location" size={13} color={THEME_COLORS.gold} />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-gold/80 font-montserrat-bold text-[9px] uppercase tracking-widest mb-0.5">
                DESTINO FINAL
              </Text>
              <Text className="text-white font-montserrat-semibold text-sm leading-5" numberOfLines={1}>
                {trip.destination?.address || 'Destino final'}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer: Net Earnings in Champagne Gold + Total Fare + Action */}
        <View className="flex-row items-end justify-between pt-3.5 border-t border-white/10">
          <View>
            <Text className="text-ash font-montserrat-bold text-[9px] uppercase tracking-widest">
              GANANCIA NETA ESTIMADA
            </Text>
            <View className="flex-row items-baseline mt-0.5">
              <Text
                className="text-gold font-montserrat-bold text-2xl tracking-tight"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                ${Number(trip.netEarnings || 0).toLocaleString('es-AR')}
              </Text>
              <Text className="text-ash font-montserrat-semibold text-[10px] ml-1.5 uppercase">
                {trip.currency || 'ARS'}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text className="text-white/50 font-montserrat text-[10px] mb-1" style={{ fontVariant: ['tabular-nums'] }}>
              Total: ${Number(trip.fare || 0).toLocaleString('es-AR')}
            </Text>
            <View className="flex-row items-center bg-white/[0.06] border border-white/15 px-3 py-1 rounded-full">
              <Text className="text-platinum font-montserrat-semibold text-[10px] uppercase tracking-wider mr-1">
                Ver Ficha
              </Text>
              <Ionicons name="chevron-forward" size={12} color={THEME_COLORS.gold} />
            </View>
          </View>
        </View>
      </LiquidGlassContainer>
    </TouchableOpacity>
  );
};
