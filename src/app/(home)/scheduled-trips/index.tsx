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
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-white/[0.08]">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Volver al dashboard"
              className="w-10 h-10 rounded-full bg-charcoal items-center justify-center border border-charcoal mr-3 shadow-sm shadow-black"
            >
              <Ionicons name="arrow-back" size={20} color={THEME_COLORS.platinum} />
            </TouchableOpacity>
            <View>
              <Text className="text-white font-montserrat-bold text-lg">
                Mis Reservas
              </Text>
              <Text className="text-zinc-400 font-montserrat text-xs">
                Viajes programados asignados
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 items-center justify-center">
              <Ionicons name="calendar" size={16} color={THEME_COLORS.gold} />
            </View>
          </View>
        </View>

        {/* Content Area */}
        <View className="flex-1 px-5 pt-4">
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
              <Text className="text-zinc-400 font-montserrat text-xs text-center mb-6 leading-5">
                {errorMsg}
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                className="bg-gold px-6 py-3 rounded-full active:opacity-80"
              >
                <Text className="text-obsidian font-montserrat-bold text-xs tracking-wider uppercase">
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : trips.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6 pb-12">
              <View className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.08] items-center justify-center mb-4">
                <Ionicons name="calendar-outline" size={36} color={THEME_COLORS.ash} />
              </View>
              <Text className="text-white font-montserrat-bold text-base mb-1.5 text-center">
                Sin reservas programadas
              </Text>
              <Text className="text-zinc-400 font-montserrat text-xs text-center leading-5 max-w-[280px]">
                Cuando la administración te asigne un viaje programado o abono, aparecerá listado aquí.
              </Text>
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
