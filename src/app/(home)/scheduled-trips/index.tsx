import React, { useState } from 'react';
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
      // Ordenar por scheduledAt ascendente (el más próximo primero)
      return [...data].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    },
    staleTime: 1000 * 60 * 2,
  });

  const errorMsg = error ? (error as any).message || 'No se pudieron cargar las reservas programadas.' : null;

  const handleCardPress = (trip: DriverScheduledTrip) => {
    setSelectedTripId(trip.id);
    setIsDetailVisible(true);
  };

  const handleCloseDetail = () => {
    setIsDetailVisible(false);
    setSelectedTripId(null);
  };

  return (
    <View className="flex-1 bg-obsidian">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Volver al dashboard"
              className="w-11 h-11 rounded-full bg-white/5 border border-white/10 items-center justify-center mr-3 active:scale-95"
            >
              <Ionicons name="arrow-back" size={22} color={THEME_COLORS.gold} />
            </TouchableOpacity>
            <View>
              <Text className="text-white font-montserrat-bold text-lg">
                Mis Reservas
              </Text>
              <Text className="text-ash font-montserrat text-xs">
                Viajes programados asignados
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gold/15 border border-gold/30 items-center justify-center">
              <Ionicons name="calendar" size={18} color={THEME_COLORS.gold} />
            </View>
          </View>
        </View>

        {/* Content Area */}
        <View className="flex-1 px-4 pt-4">
          {isLoading ? (
            <ScheduledTripSkeleton />
          ) : errorMsg ? (
            <View className="flex-1 items-center justify-center px-6">
              <View className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/40 items-center justify-center mb-4">
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  refetch();
                }}
                className="bg-gold px-6 py-3.5 rounded-2xl active:opacity-90 shadow-md shadow-gold/20"
              >
                <Text className="text-obsidian font-montserrat-bold text-xs tracking-wider uppercase">
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : trips.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6 pb-12">
              <LiquidGlassContainer
                variant="default"
                className="rounded-3xl p-8 items-center justify-center border border-white/10 max-w-[320px]"
              >
                <View className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 items-center justify-center mb-4">
                  <Ionicons name="calendar-outline" size={32} color={THEME_COLORS.gold} />
                </View>
                <Text className="text-white font-montserrat-bold text-base mb-1.5 text-center">
                  Sin reservas programadas
                </Text>
                <Text className="text-ash font-montserrat text-xs text-center leading-relaxed">
                  Cuando la administración te asigne un viaje programado o abono, aparecerá listado aquí.
                </Text>
              </LiquidGlassContainer>
            </View>
          ) : (
            <FlatList
              data={trips}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ScheduledTripCard trip={item} onPress={handleCardPress} />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
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
