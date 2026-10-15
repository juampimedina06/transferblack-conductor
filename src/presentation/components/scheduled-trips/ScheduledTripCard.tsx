import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DriverScheduledTrip } from '../../../core/trip/interface/trip.interface';
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
        variant="default"
        className="rounded-[24px] p-5 border border-white/15"
      >
        {/* Top Header: Schedule Date & Recurring Badge */}
        <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-white/10">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-8 h-8 rounded-full bg-white/15 border border-white/30 items-center justify-center mr-2.5">
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
            </View>
            <Text className="text-white font-montserrat-bold text-sm" numberOfLines={1}>
              {formatScheduledDate(trip.scheduledAt)}
            </Text>
          </View>

          {/* Badge Abono vs Puntual */}
          <View className="px-3 py-1 rounded-full border border-white/20 bg-white/10">
            <Text className="font-montserrat-bold text-[10px] tracking-wider uppercase text-white">
              {trip.isRecurring ? 'Abono recurrente' : 'Viaje puntual'}
            </Text>
          </View>
        </View>

        {/* Passenger Row with Call Button */}
        <View className="flex-row items-center justify-between mb-3.5">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 items-center justify-center mr-3">
              <Ionicons
                name={isThirdParty ? 'people' : 'person'}
                size={18}
                color="#FFFFFF"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white font-montserrat-bold text-base" numberOfLines={1}>
                {passengerName}
              </Text>
              {isThirdParty ? (
                <Text className="text-white/60 font-montserrat-medium text-[11px] uppercase tracking-wider mt-0.5">
                  Pasajero tercero
                </Text>
              ) : (
                <View className="flex-row items-center mt-0.5">
                  <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
                  <Text className="text-white/70 font-montserrat text-xs ml-1">
                    TransferBlack VIP
                  </Text>
                </View>
              )}
            </View>
          </View>

          {passengerPhone ? (
            <TouchableOpacity
              onPress={handleCall}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Llamar a ${passengerName}`}
              className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 items-center justify-center active:bg-white/20"
            >
              <Ionicons name="call" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Route Trajectory estilo TripOfferCard */}
        <View className="mb-4 border-t border-white/10 pt-2.5">
          {/* Origen */}
          <View className="flex-row items-center mb-2.5">
            <View className="w-6 h-6 rounded-full bg-white/15 border border-white/40 items-center justify-center mr-3">
              <View className="w-2 h-2 rounded-full bg-white" />
            </View>
            <View className="flex-1">
              <Text className="text-white/50 font-montserrat-bold text-[9px] uppercase tracking-wider">
                Origen
              </Text>
              <Text className="text-white font-montserrat-semibold text-sm leading-5" numberOfLines={1}>
                {trip.origin?.address || 'Ubicación de partida'}
              </Text>
            </View>
          </View>

          {/* Destino */}
          <View className="flex-row items-center">
            <View className="w-6 h-6 rounded-full bg-white/15 border border-white/40 items-center justify-center mr-3">
              <Ionicons name="location" size={13} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white/50 font-montserrat-bold text-[9px] uppercase tracking-wider">
                Destino
              </Text>
              <Text className="text-white font-montserrat-semibold text-sm leading-5" numberOfLines={1}>
                {trip.destination?.address || 'Destino final'}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer: Earnings and Total Fare estilo TripOfferCard */}
        <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
          <View>
            <Text className="text-white/50 font-montserrat-bold text-[10px] uppercase tracking-wider">
              Tu Ganancia Neta
            </Text>
            <Text
              className="text-white font-montserrat-bold text-2xl mt-0.5 tracking-tight"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              ${Number(trip.netEarnings || 0).toLocaleString('es-AR')}
            </Text>
          </View>

          <View className="items-end">
            <Text className="text-white/50 font-montserrat text-[10px] uppercase tracking-wider">
              Tarifa Total
            </Text>
            <Text
              className="text-white/70 font-montserrat-medium text-xs mt-0.5"
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

