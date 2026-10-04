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
    ? `Viaja: ${trip.thirdPartyName} (Tercero)`
    : (trip.passenger?.firstName || 'Pasajero');
  const passengerPhone = isThirdParty
    ? (trip.thirdPartyPhone || '')
    : (trip.passenger?.phone || '');

  const formatScheduledDate = (dateStr: string) => {
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
      return `${datePart.charAt(0).toUpperCase() + datePart.slice(1)} • ${timePart} hs`;
    } catch {
      return dateStr;
    }
  };

  const handleCall = (e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (passengerPhone) {
      Linking.openURL(`tel:${passengerPhone}`);
    } else {
      Alert.alert('Contacto', 'El número de teléfono no está disponible.');
    }
  };

  const handleCardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(trip);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handleCardPress}
      className="w-full mb-3.5"
      accessibilityRole="button"
      accessibilityLabel={`Reserva para ${passengerName}, fecha ${formatScheduledDate(trip.scheduledAt)}`}
    >
      <LiquidGlassContainer
        variant={trip.isRecurring ? 'gold' : 'default'}
        className="rounded-[22px] p-4 border border-white/10"
      >
        {/* Top Header: Schedule Date & Recurring Badge */}
        <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-white/10">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-8 h-8 rounded-full bg-gold/15 border border-gold/30 items-center justify-center mr-2.5">
              <Ionicons name="calendar-outline" size={16} color={THEME_COLORS.gold} />
            </View>
            <Text className="text-white font-montserrat-bold text-xs" numberOfLines={1}>
              {formatScheduledDate(trip.scheduledAt)}
            </Text>
          </View>

          {/* Badge Abono vs Puntual */}
          <View
            className={`px-3 py-1 rounded-full border ${
              trip.isRecurring
                ? 'bg-gold/15 border-gold/40'
                : 'bg-white/10 border-white/15'
            }`}
          >
            <Text
              className={`font-montserrat-semibold text-[10px] tracking-wider uppercase ${
                trip.isRecurring ? 'text-gold' : 'text-platinum'
              }`}
            >
              {trip.isRecurring ? 'Abono' : 'Puntual'}
            </Text>
          </View>
        </View>

        {/* Passenger Row with Call Button */}
        <View className="flex-row items-center justify-between mb-3.5">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 items-center justify-center mr-3">
              <Ionicons
                name={isThirdParty ? 'people' : 'person'}
                size={18}
                color={isThirdParty ? THEME_COLORS.gold : THEME_COLORS.platinum}
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-montserrat-semibold text-sm" numberOfLines={1}>
                {passengerName}
              </Text>
              {isThirdParty ? (
                <Text className="text-gold font-montserrat-medium text-[10px] uppercase tracking-wider mt-0.5">
                  Pasajero tercero
                </Text>
              ) : (
                <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                  TransferBlack VIP
                </Text>
              )}
            </View>
          </View>

          {passengerPhone ? (
            <TouchableOpacity
              onPress={handleCall}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Llamar a ${passengerName}`}
              className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 items-center justify-center active:scale-95"
            >
              <Ionicons name="call" size={16} color={THEME_COLORS.gold} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Route Trajectory */}
        <View className="mb-4 pt-1">
          {/* Origin */}
          <View className="flex-row items-start mb-2.5">
            <View className="items-center mr-3 mt-1">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <View className="w-0.5 h-5 bg-white/15 my-0.5" />
            </View>
            <View className="flex-1">
              <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider">
                Origen
              </Text>
              <Text className="text-white font-montserrat-medium text-xs leading-4 mt-0.5" numberOfLines={1}>
                {trip.origin?.address || 'Ubicación de partida'}
              </Text>
            </View>
          </View>

          {/* Destination */}
          <View className="flex-row items-start">
            <View className="items-center mr-3 mt-1">
              <View className="w-2.5 h-2.5 rounded-full bg-red-400" />
            </View>
            <View className="flex-1">
              <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider">
                Destino
              </Text>
              <Text className="text-white font-montserrat-medium text-xs leading-4 mt-0.5" numberOfLines={1}>
                {trip.destination?.address || 'Destino final'}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer: Earnings and Total Fare */}
        <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
          <View>
            <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider">
              Ganancia Neta
            </Text>
            <Text
              className="text-gold font-montserrat-bold text-lg mt-0.5"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              ${Number(trip.netEarnings || 0).toLocaleString('es-AR')} {trip.currency || 'ARS'}
            </Text>
          </View>

          <View className="items-end">
            <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider">
              Tarifa Total
            </Text>
            <Text
              className="text-platinum font-montserrat-medium text-xs mt-0.5"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              ${Number(trip.fare || 0).toLocaleString('es-AR')} {trip.currency || 'ARS'}
            </Text>
          </View>
        </View>
      </LiquidGlassContainer>
    </TouchableOpacity>
  );
};

