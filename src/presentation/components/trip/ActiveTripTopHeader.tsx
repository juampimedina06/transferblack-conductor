import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../../../core/trip/interface/trip.interface';
import { useCourtesyTimer } from '../../trip/hooks/useCourtesyTimer';

interface ActiveTripTopHeaderProps {
  trip: Trip;
}

export const ActiveTripTopHeader: React.FC<ActiveTripTopHeaderProps> = ({ trip }) => {
  const { formattedTime } = useCourtesyTimer(5);

  let maneuverIcon: keyof typeof Ionicons.glyphMap = 'navigate';
  let iconBgColor = 'bg-emerald-500';
  let instructionLabel = 'EN CAMINO AL PASAJERO';
  let targetAddress = trip.pickup?.address || 'Punto de recogida';
  let secondaryText = trip.pickup?.subtitle
    ? `Recogida: ${trip.pickup.subtitle}`
    : 'Dirígete hacia el punto de encuentro';
  let badgeLabel = 'Llegada';
  let badgeValue = trip.pickup?.etaMinutes ? `~${trip.pickup.etaMinutes} min` : 'En camino';
  let badgeValueColor = 'text-white';

  if (trip.status === 'driver_arriving') {
    maneuverIcon = 'navigate';
    iconBgColor = 'bg-emerald-500';
    instructionLabel = 'DIRÍGETE HACIA LA RECOGIDA';
    targetAddress = trip.pickup?.address || 'Punto de recogida';
    secondaryText = trip.pickup?.subtitle
      ? `Pasajero: ${trip.pickup.subtitle}`
      : 'Dirígete hacia el punto de encuentro';
    badgeLabel = 'Llegada';
    badgeValue = trip.pickup?.etaMinutes ? `~${trip.pickup.etaMinutes} min` : 'En camino';
    badgeValueColor = 'text-emerald-400';
  } else if (trip.status === 'driver_arrived') {
    maneuverIcon = 'location';
    iconBgColor = 'bg-amber-500';
    instructionLabel = 'PUNTO DE ENCUENTRO';
    targetAddress = trip.pickup?.address || 'Punto de encuentro';
    secondaryText = 'Esperando al pasajero en el punto';
    badgeLabel = 'Espera';
    badgeValue = formattedTime;
    badgeValueColor = 'text-amber-400';
  } else if (trip.status === 'in_progress') {
    maneuverIcon = 'navigate';
    iconBgColor = 'bg-emerald-500';
    instructionLabel = 'DIRÍGETE AL DESTINO';
    targetAddress = trip.dropoff?.address || 'Destino final';
    secondaryText = trip.dropoff?.subtitle
      ? `Destino: ${trip.dropoff.subtitle}`
      : 'Conduce hacia el destino indicado';
    badgeLabel = 'Llegada';
    badgeValue = trip.dropoff?.durationMinutes ? `~${trip.dropoff.durationMinutes} min` : 'En curso';
    badgeValueColor = 'text-white';
  } else if (trip.status === 'completed') {
    maneuverIcon = 'checkmark-circle';
    iconBgColor = 'bg-emerald-600';
    instructionLabel = 'VIAJE COMPLETADO';
    targetAddress = trip.dropoff?.address || 'Destino alcanzado';
    secondaryText = 'Has llegado al destino final';
    badgeLabel = 'Estado';
    badgeValue = 'Finalizado';
    badgeValueColor = 'text-white';
  }

  return (
    <View className="w-full px-3 pt-1">
      <View className="w-full bg-[#12131A] border border-white/15 rounded-2xl p-3 shadow-2xl shadow-black flex-row items-center relative overflow-hidden">
        {/* Specular top highlight */}
        <View className="absolute top-0 left-4 right-4 h-[1px] bg-white/20 pointer-events-none" />

        {/* Maneuver Icon (Uber style navigation icon) */}
        <View className={`w-12 h-12 rounded-xl ${iconBgColor} items-center justify-center mr-3 shadow-md shadow-black`}>
          <Ionicons name={maneuverIcon} size={24} color="#FFFFFF" />
        </View>

        {/* Text Details */}
        <View className="flex-1 mr-2 justify-center">
          <Text className="text-emerald-400 font-montserrat-bold text-[10px] tracking-wider uppercase mb-0.5">
            {instructionLabel}
          </Text>
          <Text className="text-white font-montserrat-bold text-sm leading-tight" numberOfLines={1}>
            {targetAddress}
          </Text>
          <Text className="text-zinc-400 font-montserrat-medium text-xs mt-0.5" numberOfLines={1}>
            {secondaryText}
          </Text>
        </View>

        {/* ETA / Countdown Badge */}
        <View className="bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl items-end justify-center min-w-[64px]">
          <Text className="text-zinc-400 font-montserrat-medium text-[9px] uppercase tracking-wider mb-0.5">
            {badgeLabel}
          </Text>
          <Text
            className={`${badgeValueColor} font-montserrat-bold text-xs`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {badgeValue}
          </Text>
        </View>
      </View>
    </View>
  );
};
