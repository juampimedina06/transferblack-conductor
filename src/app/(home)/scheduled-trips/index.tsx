import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { getDriverScheduledTrips } from '@/core/trip/actions/trip.actions';
import { DriverScheduledTrip } from '@/core/trip/interface/trip.interface';
import { THEME_COLORS } from '@/core/constants/theme';
import { ScheduledTripCard } from '@/presentation/components/scheduled-trips/ScheduledTripCard';
import { ScheduledTripSkeleton } from '@/presentation/components/scheduled-trips/ScheduledTripSkeleton';
import { ScheduledTripDetailModal } from '@/presentation/components/scheduled-trips/ScheduledTripDetailModal';
import * as Haptics from 'expo-haptics';
import { LiquidGlassContainer } from '@/presentation/components/ui/LiquidGlassContainer';
import { AmbientGlow } from '@/presentation/components/ui/AmbientGlow';

export default function ScheduledTripsScreen() {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState<boolean>(false);

  const {
    data: trips = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['driver', 'scheduled-trips'],
    queryFn: async () => {
      const data = await getDriverScheduledTrips();
      return [...data].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    },
    staleTime: 1000 * 60 * 2,
  });

  const errorMsg = error
    ? (error as any).message || 'No se pudieron cargar las reservas programadas.'
    : null;

  const totalNetProjected = useMemo(
    () => trips.reduce((acc, item) => acc + Number(item.netEarnings || 0), 0),
    [trips]
  );

  const recurringCount = useMemo(
    () => trips.filter((item) => item.isRecurring).length,
    [trips]
  );

  const handleCardPress = (trip: DriverScheduledTrip): void => {
    setSelectedTripId(trip.id);
    setIsDetailVisible(true);
  };

  const handleCloseDetail = (): void => {
    setIsDetailVisible(false);
    setSelectedTripId(null);
  };

  return (
    <View className="flex-1 bg-obsidian">
      <StatusBar style="light" />

      {/* Top Ambient Champagne Gold Glow */}
      <AmbientGlow color="#D4AF37" position="top" height={320} opacity={0.16} />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Executive Top Header */}
        <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-white/10">
          <View className="flex-row items-center flex-1 mr-3">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Volver al dashboard"
              className="w-11 h-11 rounded-2xl bg-[#13141E] border border-gold/40 items-center justify-center mr-3.5 shadow-lg shadow-black active:scale-95"
            >
              <Ionicons name="arrow-back" size={20} color={THEME_COLORS.gold} />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-gold font-montserrat-bold text-[10px] uppercase tracking-widest mb-0.5">
                AGENDA EJECUTIVA
              </Text>
              <Text className="text-white font-montserrat-bold text-xl">
                Mis Reservas
              </Text>
            </View>
          </View>

          <View className="flex-row items-center bg-gold/15 border border-gold/40 px-3 py-1.5 rounded-full">
            <Ionicons name="calendar" size={14} color={THEME_COLORS.gold} />
            <Text
              className="text-gold font-montserrat-bold text-xs ml-1.5"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {trips.length} {trips.length === 1 ? 'Viaje' : 'Viajes'}
            </Text>
          </View>
        </View>

        {/* Content Area */}
        <View className="flex-1 px-4 pt-4">
          {isLoading ? (
            <ScheduledTripSkeleton />
          ) : errorMsg ? (
            <View className="flex-1 items-center justify-center px-6">
              <LiquidGlassContainer
                variant="danger"
                className="rounded-3xl p-7 items-center justify-center w-full max-w-[340px]"
              >
                <View className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/40 items-center justify-center mb-4">
                  <Ionicons name="alert-circle-outline" size={32} color="#F87171" />
                </View>
                <Text className="text-white font-montserrat-bold text-lg mb-2 text-center">
                  Error al cargar reservas
                </Text>
                <Text className="text-ash font-montserrat text-xs text-center mb-6 leading-5">
                  {errorMsg}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    void refetch();
                  }}
                  className="bg-gold w-full py-3.5 rounded-2xl items-center justify-center active:opacity-90 shadow-md shadow-gold/20"
                >
                  <Text className="text-obsidian font-montserrat-bold text-xs tracking-widest uppercase">
                    Reintentar
                  </Text>
                </TouchableOpacity>
              </LiquidGlassContainer>
            </View>
          ) : trips.length === 0 ? (
            <View className="flex-1 items-center justify-center px-4 pb-12">
              <LiquidGlassContainer
                variant="gold"
                className="rounded-[32px] p-8 items-center justify-center border border-gold/30 w-full max-w-[350px]"
              >
                <View className="w-20 h-20 rounded-3xl bg-gold/15 border border-gold/40 items-center justify-center mb-5 shadow-lg shadow-black">
                  <Ionicons name="calendar-clear-outline" size={36} color={THEME_COLORS.gold} />
                </View>
                <View className="bg-gold/15 border border-gold/30 px-3 py-1 rounded-full mb-3">
                  <Text className="text-gold font-montserrat-bold text-[10px] uppercase tracking-widest">
                    AGENDA DESPEJADA
                  </Text>
                </View>
                <Text className="text-white font-montserrat-bold text-lg mb-2 text-center">
                  Sin reservas programadas
                </Text>
                <Text className="text-ash font-montserrat text-xs text-center leading-5 mb-6">
                  Cuando la central ejecutiva te asigne un traslado corporativo o abono recurrente, aparecerá detallado en esta agenda.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    void refetch();
                  }}
                  className="flex-row items-center bg-white/[0.07] border border-white/15 px-5 py-2.5 rounded-xl active:bg-white/15"
                >
                  <Ionicons name="refresh" size={14} color={THEME_COLORS.gold} />
                  <Text className="text-platinum font-montserrat-semibold text-xs ml-2">
                    Actualizar agenda
                  </Text>
                </TouchableOpacity>
              </LiquidGlassContainer>
            </View>
          ) : (
            <FlatList
              data={trips}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <View className="mb-4">
                  <LiquidGlassContainer
                    variant="gold"
                    className="rounded-3xl p-4 border border-gold/35"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-3">
                        <Text className="text-gold font-montserrat-bold text-[10px] uppercase tracking-widest mb-1">
                          INGRESOS PROYECTADOS EN AGENDA
                        </Text>
                        <Text
                          className="text-white font-montserrat-bold text-2xl"
                          style={{ fontVariant: ['tabular-nums'] }}
                        >
                          ${totalNetProjected.toLocaleString('es-AR')}
                          <Text className="text-ash font-montserrat-medium text-xs"> ARS</Text>
                        </Text>
                      </View>
                      <View className="items-end bg-white/[0.05] border border-white/10 px-3.5 py-2 rounded-2xl">
                        <Text className="text-ash font-montserrat-semibold text-[10px] uppercase tracking-wider">
                          Modalidad
                        </Text>
                        <Text className="text-gold font-montserrat-bold text-xs mt-0.5">
                          {recurringCount > 0
                            ? `${recurringCount} Abono${recurringCount > 1 ? 's' : ''} VIP`
                            : 'Traslados VIP'}
                        </Text>
                      </View>
                    </View>
                  </LiquidGlassContainer>
                </View>
              }
              renderItem={({ item }) => (
                <ScheduledTripCard trip={item} onPress={handleCardPress} />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 28 }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={() => refetch()}
                  tintColor={THEME_COLORS.gold}
                  colors={[THEME_COLORS.gold]}
                />
              }
            />
          )}
        </View>

        {/* Anticipated Detail Modal */}
        <ScheduledTripDetailModal
          tripId={selectedTripId}
          visible={isDetailVisible}
          onClose={handleCloseDetail}
        />
      </SafeAreaView>
    </View>
  );
}
