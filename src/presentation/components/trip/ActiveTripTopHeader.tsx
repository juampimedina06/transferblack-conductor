import React from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../../../core/trip/interface/trip.interface';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useCourtesyTimer } from '../../trip/hooks/useCourtesyTimer';
import { AmbientGlow } from '../ui/AmbientGlow';

interface ActiveTripTopHeaderProps {
  trip: Trip;
}

export const ActiveTripTopHeader: React.FC<ActiveTripTopHeaderProps> = ({ trip }) => {
  const { formattedTime, isFinished: isCourtesyExpired } = useCourtesyTimer(5);

  let maneuverIcon: keyof typeof Ionicons.glyphMap = 'navigate';
  let accentColor = '#10B981';
  let iconBoxClasses = 'bg-emerald-500/20 border-emerald-400/50';
  let kickerColorClasses = 'text-emerald-400';
  let dotColorClasses = 'bg-emerald-400';
  let instructionLabel = 'EN CAMINO AL PASAJERO';
  let targetAddress = trip.pickup?.address || 'Punto de recogida';
  let secondaryText = trip.pickup?.subtitle
    ? `Recogida: ${trip.pickup.subtitle}`
    : 'Seguí la línea dorada hacia el punto de encuentro';
  let badgeLabel = 'LLEGADA';
  let badgeValue = trip.pickup?.etaMinutes ? `${trip.pickup.etaMinutes} min` : 'En ruta';
  let badgeValueColor = 'text-emerald-400';

  if (trip.status === 'driver_arriving') {
    maneuverIcon = 'navigate';
    accentColor = '#10B981';
    iconBoxClasses = 'bg-emerald-500/20 border-emerald-400/50';
    kickerColorClasses = 'text-emerald-400';
    dotColorClasses = 'bg-emerald-400';
    instructionLabel = 'DIRÍGETE AL PUNTO DE RETIRO';
    targetAddress = trip.pickup?.address || 'Punto de recogida';
    secondaryText = trip.pickup?.subtitle
      ? `Pasajero: ${trip.pickup.subtitle}`
      : 'Mantené el rumbo indicado en el mapa';
    badgeLabel = 'ESTIMADO';
    badgeValue = trip.pickup?.etaMinutes ? `~${trip.pickup.etaMinutes} min` : 'En ruta';
    badgeValueColor = 'text-emerald-400';
  } else if (trip.status === 'driver_arrived') {
    maneuverIcon = 'location';
    accentColor = isCourtesyExpired ? '#F43F5E' : THEME_COLORS.gold;
    iconBoxClasses = isCourtesyExpired
      ? 'bg-rose-500/20 border-rose-400/50'
      : 'bg-gold/20 border-gold/55';
    kickerColorClasses = isCourtesyExpired ? 'text-rose-400' : 'text-gold';
    dotColorClasses = isCourtesyExpired ? 'bg-rose-400' : 'bg-gold';
    instructionLabel = isCourtesyExpired ? 'ESPERA TARIFADA ACTIVA' : 'EN PUNTO DE ENCUENTRO';
    targetAddress = trip.pickup?.address || 'Punto de encuentro';
    secondaryText = 'Aguardando el abordaje del pasajero VIP';
    badgeLabel = 'ESPERA';
    badgeValue = formattedTime;
    badgeValueColor = isCourtesyExpired ? 'text-rose-400' : 'text-gold';
  } else if (trip.status === 'in_progress') {
    maneuverIcon = 'navigate';
    accentColor = THEME_COLORS.gold;
    iconBoxClasses = 'bg-gold/20 border-gold/55';
    kickerColorClasses = 'text-gold';
    dotColorClasses = 'bg-gold';
    instructionLabel = 'TRASLADO EJECUTIVO EN CURSO';
    targetAddress = trip.dropoff?.address || 'Destino final';
    secondaryText = trip.dropoff?.subtitle
      ? `Hacia: ${trip.dropoff.subtitle}`
      : 'Seguí la traza principal hacia el destino';
    badgeLabel = 'DESTINO';
    badgeValue = trip.dropoff?.durationMinutes ? `~${trip.dropoff.durationMinutes} min` : 'En curso';
    badgeValueColor = 'text-white';
  } else if (trip.status === 'completed') {
    maneuverIcon = 'checkmark-circle';
    accentColor = '#10B981';
    iconBoxClasses = 'bg-emerald-500/20 border-emerald-400/50';
    kickerColorClasses = 'text-emerald-400';
    dotColorClasses = 'bg-emerald-400';
    instructionLabel = 'VIAJE COMPLETADO';
    targetAddress = trip.dropoff?.address || 'Destino alcanzado';
    secondaryText = 'Has llegado al destino final';
    badgeLabel = 'ESTADO';
    badgeValue = 'Listo';
    badgeValueColor = 'text-emerald-400';
  }

  return (
    <View className="w-full px-3.5 pt-1.5">
      <View className="w-full rounded-[26px] border border-white/20 p-3.5 shadow-2xl shadow-black flex-row items-center relative overflow-hidden">
        {/* Frosted Glass Blur */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 85}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          className="bg-[#090A0F]/92"
        />

        {/* Ambient Radial Glow */}
        <AmbientGlow
          position="top-left"
          height={140}
          opacity={0.2}
          color={accentColor}
        />

        {/* Specular top highlight */}
        <View
          pointerEvents="none"
          className="absolute top-0 left-6 right-6 h-[1px] bg-white/30"
        />

        {/* Sculpted Maneuver Icon Box */}
        <View
          className={`w-13 h-13 w-[52px] h-[52px] rounded-2xl border ${iconBoxClasses} items-center justify-center mr-3.5 shadow-lg shadow-black`}
        >
          <Ionicons name={maneuverIcon} size={25} color={accentColor} />
        </View>

        {/* Street & Maneuver Instructions */}
        <View className="flex-1 mr-2.5 justify-center">
          <View className="flex-row items-center mb-0.5">
            <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColorClasses}`} />
            <Text
              className={`${kickerColorClasses} font-montserrat-bold text-[9px] tracking-widest uppercase`}
              numberOfLines={1}
            >
              {instructionLabel}
            </Text>
          </View>
          <Text
            className="text-white font-montserrat-bold text-base leading-tight"
            numberOfLines={1}
          >
            {targetAddress}
          </Text>
          <Text
            className="text-ash font-montserrat-medium text-[11px] mt-0.5"
            numberOfLines={1}
          >
            {secondaryText}
          </Text>
        </View>

        {/* HUD Telemetry Pill */}
        <View className="bg-white/[0.06] border border-white/15 px-3 py-2 rounded-2xl items-center justify-center min-w-[70px]">
          <Text className="text-ash font-montserrat-bold text-[8px] uppercase tracking-widest mb-0.5">
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
