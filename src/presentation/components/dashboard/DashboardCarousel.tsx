import React from 'react';
import { ScrollView, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export interface DashboardStats {
  earningsToday: number;
  completedTripsToday: number;
  acceptanceRate: number;
  cancellationRate: number;
  rating: number;
}

interface DashboardCarouselProps {
  stats?: DashboardStats;
  onPressProgress?: () => void;
}

export const DashboardCarousel = ({ stats, onPressProgress }: DashboardCarouselProps) => {
  // Mock data si no vienen stats
  const defaultStats: DashboardStats = {
    earningsToday: 0,
    completedTripsToday: 0,
    acceptanceRate: 0,
    cancellationRate: 0,
    rating: 5.0,
  };

  const currentStats = stats || defaultStats;

  return (
    <View className="mt-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_WIDTH + 16} // ancho + gap
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2 }}
      >
        {/* Tarjeta 1: Ganancias y Viajes */}
        <View 
          style={{ width: CARD_WIDTH, marginHorizontal: 8 }}
          className="bg-[#1A1A1C]/90 rounded-2xl p-4 border border-[#2C2C2E] shadow-sm shadow-black"
        >
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-ash font-montserrat-semibold text-sm">Ganancias Hoy</Text>
            <Ionicons name="wallet-outline" size={20} color={THEME_COLORS.gold} />
          </View>
          <Text className="text-platinum font-montserrat-bold text-3xl mb-1">
            ${currentStats.earningsToday.toFixed(2)}
          </Text>
          <Text className="text-ash/80 font-montserrat text-xs">
            Se completaron {currentStats.completedTripsToday} solicitudes de viaje
          </Text>
        </View>

        {/* Tarjeta 2: Tasa de Aceptación */}
        <View 
          style={{ width: CARD_WIDTH, marginHorizontal: 8 }}
          className="bg-[#1A1A1C]/90 rounded-2xl p-4 border border-[#2C2C2E] shadow-sm shadow-black justify-between"
        >
          <View>
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-ash font-montserrat-semibold text-sm">Tasa de Aceptación</Text>
              <Text className="text-platinum font-montserrat-bold text-lg">{currentStats.acceptanceRate}%</Text>
            </View>
            <Text className="text-ash/80 font-montserrat text-xs">
              Mantené tu tasa por encima del 80% para mejores viajes.
            </Text>
          </View>
          <TouchableOpacity 
            onPress={onPressProgress} 
            className="mt-3 flex-row items-center"
          >
            <Text className="text-gold font-montserrat-semibold text-xs uppercase mr-1">
              Ver Progreso
            </Text>
            <Ionicons name="chevron-forward" size={14} color={THEME_COLORS.gold} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
