import React from 'react';
import { ScrollView, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '../../../core/constants/theme';
import { router } from 'expo-router';
import { LiquidGlassContainer } from '../ui/LiquidGlassContainer';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.86;

export interface DashboardStats {
  earningsToday: number;
  completedTripsToday: number;
  acceptanceRate: number;
  cancellationRate: number;
  rating: number;
  balance?: number;
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
    balance: 0,
  };

  const currentStats = stats || defaultStats;
  const isNegative = (currentStats.balance ?? 0) < 0;
  const displayAmount = isNegative 
    ? currentStats.balance! 
    : ((currentStats.balance && currentStats.balance > 0) ? currentStats.balance : currentStats.earningsToday);

  return (
    <View className="mt-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_WIDTH + 14}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2 }}
      >
        {/* Tarjeta 1: Saldo / Ganancias y Viajes */}
        <TouchableOpacity 
          activeOpacity={0.88}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/wallet' as any);
          }}
          style={{ width: CARD_WIDTH, marginHorizontal: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Ver detalle de la Bóveda"
        >
          <LiquidGlassContainer
            variant={isNegative ? 'danger' : 'gold'}
            className="rounded-[28px] p-5 justify-between min-h-[160px]"
          >
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className={`font-montserrat-semibold text-xs uppercase tracking-wider ${isNegative ? 'text-red-300' : 'text-ash'}`}>
                  {isNegative ? 'Saldo Actual (Deuda)' : 'Ganancias Hoy'}
                </Text>
                <View className={`w-8 h-8 rounded-xl items-center justify-center ${isNegative ? 'bg-red-500/20' : 'bg-gold/20'}`}>
                  <Ionicons 
                    name={isNegative ? 'warning-outline' : 'wallet-outline'} 
                    size={17} 
                    color={isNegative ? '#F87171' : THEME_COLORS.gold} 
                  />
                </View>
              </View>

              <Text 
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ fontVariant: ['tabular-nums'] }}
                className={`font-montserrat-bold text-3xl mb-1.5 ${isNegative ? 'text-red-400' : 'text-white'}`}
              >
                {isNegative ? `-$${Math.abs(displayAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : `$${displayAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              </Text>
            </View>

            <View className="flex-row justify-between items-center pt-3 border-t border-white/10">
              <Text className={`font-montserrat text-xs flex-1 mr-3 ${isNegative ? 'text-red-300/80' : 'text-ash'}`} numberOfLines={1}>
                {isNegative 
                  ? `Comisiones en ${currentStats.completedTripsToday} viajes en efectivo`
                  : `${currentStats.completedTripsToday} solicitudes completadas`}
              </Text>
              <View className="flex-row items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Text className="text-gold font-montserrat-semibold text-[11px] uppercase mr-1">Bóveda</Text>
                <Ionicons name="chevron-forward" size={12} color={THEME_COLORS.gold} />
              </View>
            </View>
          </LiquidGlassContainer>
        </TouchableOpacity>

        {/* Tarjeta 2: Tasa de Aceptación */}
        <TouchableOpacity 
          activeOpacity={0.88}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPressProgress?.();
          }}
          style={{ width: CARD_WIDTH, marginHorizontal: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Ver progreso del conductor"
        >
          <LiquidGlassContainer
            variant="default"
            className="rounded-[28px] p-5 justify-between min-h-[160px]"
          >
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-ash font-montserrat-semibold text-xs uppercase tracking-wider">Tasa de Aceptación</Text>
                <View className="w-8 h-8 rounded-xl bg-white/10 items-center justify-center">
                  <Ionicons name="trending-up-outline" size={17} color={THEME_COLORS.platinum} />
                </View>
              </View>
              <View className="flex-row items-baseline mb-1">
                <Text 
                  style={{ fontVariant: ['tabular-nums'] }}
                  className="text-platinum font-montserrat-bold text-3xl mr-2"
                >
                  {currentStats.acceptanceRate}%
                </Text>
                <Text className="text-emerald-400 font-montserrat-semibold text-xs">
                  {currentStats.acceptanceRate >= 80 ? 'Excelente' : 'A mejorar'}
                </Text>
              </View>
              <Text className="text-ash/80 font-montserrat text-xs mt-0.5" numberOfLines={1}>
                Mantené tu tasa alta para recibir prioridad en viajes VIP.
              </Text>
            </View>

            <View className="flex-row justify-between items-center pt-3 border-t border-white/10">
              <Text className="text-ash font-montserrat text-xs">
                Rendimiento general
              </Text>
              <View className="flex-row items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Text className="text-gold font-montserrat-semibold text-[11px] uppercase mr-1">
                  Ver Progreso
                </Text>
                <Ionicons name="chevron-forward" size={12} color={THEME_COLORS.gold} />
              </View>
            </View>
          </LiquidGlassContainer>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

