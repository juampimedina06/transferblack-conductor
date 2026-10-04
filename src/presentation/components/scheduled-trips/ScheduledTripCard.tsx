import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverScheduledTrip } from '../../../core/trip/interface/trip.interface';
import { THEME_COLORS } from '../../../core/constants/theme';

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
    if (passengerPhone) {
      Linking.openURL(`tel:${passengerPhone}`);
    } else {
      Alert.alert('Contacto', 'El número de teléfono no está disponible.');
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(trip)}
      className="w-full bg-[#141417] border border-white/[0.08] rounded-2xl p-4 mb-3.5 shadow-lg shadow-black/40"
      accessibilityRole="button"
      accessibilityLabel={`Reserva para ${passengerName}, fecha ${formatScheduledDate(trip.scheduledAt)}`}
    >
      {/* Top Header: Schedule Date & Recurring Badge */}
      <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-white/[0.06]">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-7 h-7 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 items-center justify-center mr-2">
            <Ionicons name="calendar-outline" size={14} color={THEME_COLORS.gold} />
          </View>
          <Text className="text-white font-montserrat-bold text-xs" numberOfLines={1}>
            {formatScheduledDate(trip.scheduledAt)}
          </Text>
        </View>

        {/* Badge Abono vs Puntual */}
        <View
          className={`px-2.5 py-1 rounded-full border ${
            trip.isRecurring
              ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40'
              : 'bg-white/[0.06] border-white/15'
          }`}
        >
          <Text
            className={`font-montserrat-semibold text-[10px] tracking-wider uppercase ${
              trip.isRecurring ? 'text-[#D4AF37]' : 'text-zinc-300'
            }`}
          >
            {trip.isRecurring ? 'Abono' : 'Puntual'}
          </Text>
        </View>
      </View>

      {/* Passenger Row with Call Button */}
      <View className="flex-row items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 mb-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-8 h-8 rounded-full bg-charcoal border border-charcoal items-center justify-center mr-2.5">
            <Ionicons
              name={isThirdParty ? 'people' : 'person'}
              size={15}
              color={isThirdParty ? THEME_COLORS.gold : THEME_COLORS.platinum}
            />
          </View>
          <View className="flex-1">
            <Text className="text-white font-montserrat-semibold text-xs" numberOfLines={1}>
              {passengerName}
            </Text>
            {isThirdParty && (
              <Text className="text-[#D4AF37] font-montserrat text-[10px] uppercase tracking-wider">
                Pasajero tercero
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
            className="w-8 h-8 rounded-full bg-[#1E1E24] border border-zinc-700/80 items-center justify-center active:opacity-70"
          >
            <Ionicons name="call" size={13} color={THEME_COLORS.platinum} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Route Trajectory */}
      <View className="mb-3.5 px-0.5">
        {/* Origin */}
        <View className="flex-row items-start mb-2">
          <View className="items-center mr-2.5 mt-1">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <View className="w-0.5 h-5 bg-zinc-700 my-0.5" />
          </View>
          <View className="flex-1">
            <Text className="text-zinc-400 font-montserrat-medium text-[10px] uppercase tracking-wider">
              Origen
            </Text>
            <Text className="text-white font-montserrat-medium text-xs leading-4" numberOfLines={1}>
              {trip.origin?.address || 'Ubicación de partida'}
            </Text>
          </View>
        </View>

        {/* Destination */}
        <View className="flex-row items-start">
          <View className="items-center mr-2.5 mt-1">
            <View className="w-2.5 h-2.5 rounded-full bg-red-400" />
          </View>
          <View className="flex-1">
            <Text className="text-zinc-400 font-montserrat-medium text-[10px] uppercase tracking-wider">
              Destino
            </Text>
            <Text className="text-white font-montserrat-medium text-xs leading-4" numberOfLines={1}>
              {trip.destination?.address || 'Destino final'}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer: Earnings and Total Fare */}
      <View className="flex-row items-center justify-between pt-2.5 border-t border-white/[0.06]">
        <View>
          <Text className="text-zinc-400 font-montserrat text-[10px] uppercase tracking-wider">
            Ganancia Neta
          </Text>
          <Text className="text-[#D4AF37] font-montserrat-bold text-base">
            ${Number(trip.netEarnings || 0).toLocaleString('es-AR')} {trip.currency || 'ARS'}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-zinc-500 font-montserrat text-[10px] uppercase tracking-wider">
            Tarifa Total
          </Text>
          <Text className="text-zinc-300 font-montserrat-semibold text-xs">
            ${Number(trip.fare || 0).toLocaleString('es-AR')} {trip.currency || 'ARS'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
