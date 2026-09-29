import React from 'react';
import { View, Text } from 'react-native';
import { Trip } from '../../../core/trip/interface/trip.interface';
import { useCourtesyTimer } from '../../trip/hooks/useCourtesyTimer';

interface ActiveTripTopHeaderProps {
  trip: Trip;
}

export const ActiveTripTopHeader = ({ trip }: ActiveTripTopHeaderProps) => {
  const { formattedTime } = useCourtesyTimer(5);

  let statusDotColor = 'bg-emerald-400';
  let statusTextColor = 'text-emerald-400';
  let statusLabel = 'EN PUNTO DE RECOGIDA';
  let locationTitle = trip.pickup?.subtitle || trip.pickup?.address || 'Punto de recogida';
  let badgeLabel = 'Espera';
  let badgeValue = formattedTime;
  let badgeValueColor = 'text-[#EAB308]';

  if (trip.status === 'driver_arriving') {
    statusDotColor = 'bg-amber-400';
    statusTextColor = 'text-amber-400';
    statusLabel = 'EN CAMINO AL PASAJERO';
    locationTitle = trip.pickup?.subtitle 
      ? `${trip.pickup.subtitle} • ${trip.pickup.address}` 
      : (trip.pickup?.address || 'Punto de recogida');
    badgeLabel = 'Llegada';
    badgeValue = `~${trip.pickup?.etaMinutes || 2} min`;
    badgeValueColor = 'text-emerald-400';
  } else if (trip.status === 'driver_arrived') {
    statusDotColor = 'bg-emerald-400';
    statusTextColor = 'text-emerald-400';
    statusLabel = 'EN PUNTO DE RECOGIDA';
    locationTitle = trip.pickup?.subtitle 
      ? `${trip.pickup.subtitle} • ${trip.pickup.address}` 
      : (trip.pickup?.address || 'Punto de recogida');
    badgeLabel = 'Espera';
    badgeValue = formattedTime;
    badgeValueColor = 'text-[#EAB308]';
  } else if (trip.status === 'in_progress') {
    statusDotColor = 'bg-blue-400';
    statusTextColor = 'text-blue-400';
    statusLabel = 'VIAJE EN CURSO';
    locationTitle = trip.dropoff?.subtitle 
      ? `${trip.dropoff.subtitle} • ${trip.dropoff.address}` 
      : (trip.dropoff?.address || 'Destino final');
    badgeLabel = 'Destino';
    badgeValue = trip.dropoff?.durationMinutes ? `~${trip.dropoff.durationMinutes} min` : 'En curso';
    badgeValueColor = 'text-[#EAB308]';
  } else if (trip.status === 'completed') {
    statusDotColor = 'bg-emerald-400';
    statusTextColor = 'text-emerald-400';
    statusLabel = 'VIAJE COMPLETADO';
    locationTitle = 'Destino alcanzado';
    badgeLabel = 'Estado';
    badgeValue = 'Finalizado';
    badgeValueColor = 'text-white';
  }

  return (
    <View className="flex-1 mx-2 bg-[#121214]/95 border border-[#27272A] px-3.5 py-2 rounded-2xl flex-row items-center justify-between shadow-lg shadow-black">
      <View className="flex-1 mr-2">
        <View className="flex-row items-center mb-0.5">
          <View className={`w-2 h-2 rounded-full ${statusDotColor} mr-1.5`} />
          <Text className={`${statusTextColor} font-montserrat-semibold text-[10px] tracking-wider uppercase`}>
            {statusLabel}
          </Text>
        </View>
        <Text className="text-white font-montserrat-bold text-xs" numberOfLines={1}>
          {locationTitle}
        </Text>
      </View>

      <View className="bg-[#1C1C1E] border border-[#2C2C2E] px-2.5 py-1.5 rounded-xl flex-row items-center">
        <Text className="text-zinc-400 font-montserrat text-[11px] mr-1">
          {badgeLabel}
        </Text>
        <Text className={`${badgeValueColor} font-montserrat-bold text-xs`}>
          {badgeValue}
        </Text>
      </View>
    </View>
  );
};
