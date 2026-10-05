import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '../../../core/constants/theme';
import { LiquidGlassContainer } from '../ui/LiquidGlassContainer';
import { AmbientGlow } from '../ui/AmbientGlow';
import type { DashboardStats } from './DashboardCarousel';

interface DriverProgressModalProps {
  visible: boolean;
  stats?: DashboardStats;
  onClose: () => void;
}

export const DriverProgressModal = ({
  visible,
  stats,
  onClose,
}: DriverProgressModalProps) => {
  const currentStats = {
    earningsToday: Number(stats?.earningsToday) || 0,
    completedTripsToday: Number(stats?.completedTripsToday) || 0,
    acceptanceRate: Number(stats?.acceptanceRate) || 100,
    cancellationRate: Number(stats?.cancellationRate) || 0,
    rating: Number(stats?.rating) || 5.0,
    balance: Number(stats?.balance) || 0,
  };
  const isNegative = currentStats.balance < 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/75 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-[#0A0B10]/98 rounded-t-[36px] border-t border-[#D4AF37]/30 max-h-[85%] pb-8 shadow-2xl relative overflow-hidden">
              {/* Top Specular Edge Glass Highlight */}
              <View className="absolute top-0 left-8 right-8 h-[1px] bg-white/25 pointer-events-none" />

              {/* Ambient Glow */}
              <AmbientGlow position="top-right" height={220} opacity={0.2} color="#D4AF37" />

              {/* Drag Handle Indicator */}
              <View className="w-11 h-1 bg-white/25 rounded-full self-center mt-3 mb-1" />

              {/* Header */}
              <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-white/10">
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                  }}
                  className="w-10 h-10 items-center justify-center rounded-2xl bg-white/5 border border-white/15"
                  accessibilityLabel="Cerrar progreso"
                >
                  <Ionicons name="close" size={20} color={THEME_COLORS.platinum} />
                </TouchableOpacity>

                <Text className="text-white font-montserrat-bold text-base text-center flex-1 pr-10 uppercase tracking-wide">
                  Rendimiento y Progreso
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
              >
                {/* Rating Card */}
                <LiquidGlassContainer
                  variant="gold"
                  className="p-5 rounded-[28px] items-center mb-4"
                >
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="star" size={32} color={THEME_COLORS.gold} />
                    <Text 
                      style={{ fontVariant: ['tabular-nums'] }}
                      className="text-white font-montserrat-bold text-4xl ml-2.5"
                    >
                      {Number(currentStats.rating || 5.0).toFixed(1)}
                    </Text>
                  </View>
                  <View className="bg-gold/15 px-3 py-1 rounded-full border border-gold/30 mt-1 mb-2">
                    <Text className="text-gold font-montserrat-bold text-xs tracking-widest uppercase">
                      Conductor VIP TransferBlack
                    </Text>
                  </View>
                  <Text className="text-ash font-montserrat text-xs text-center leading-4">
                    Reputación sobresaliente. Tus pasajeros destacan tu elegancia, puntualidad y servicio.
                  </Text>
                </LiquidGlassContainer>

                {/* Acceptance Rate Card */}
                <LiquidGlassContainer
                  variant="default"
                  className="p-4 rounded-2xl mb-3"
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={19} color="#34D399" />
                      <Text className="text-white font-montserrat-semibold text-xs uppercase tracking-wider ml-2">
                        Tasa de Aceptación
                      </Text>
                    </View>
                    <Text 
                      style={{ fontVariant: ['tabular-nums'] }}
                      className="text-white font-montserrat-bold text-base"
                    >
                      {currentStats.acceptanceRate}%
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                    <View
                      style={{ width: `${Math.min(currentStats.acceptanceRate, 100)}%` }}
                      className="h-full bg-emerald-400 rounded-full"
                    />
                  </View>
                  <Text className="text-ash font-montserrat text-[11px]">
                    Meta sugerida: mantenerla en 80% o más para recibir asignaciones prioritarias.
                  </Text>
                </LiquidGlassContainer>

                {/* Cancellation Rate Card */}
                <LiquidGlassContainer
                  variant="default"
                  className="p-4 rounded-2xl mb-3"
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center">
                      <Ionicons name="close-circle" size={19} color="#F87171" />
                      <Text className="text-white font-montserrat-semibold text-xs uppercase tracking-wider ml-2">
                        Tasa de Cancelación
                      </Text>
                    </View>
                    <Text 
                      style={{ fontVariant: ['tabular-nums'] }}
                      className="text-white font-montserrat-bold text-base"
                    >
                      {currentStats.cancellationRate}%
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                    <View
                      style={{ width: `${Math.min(currentStats.cancellationRate, 100)}%` }}
                      className="h-full bg-red-500 rounded-full"
                    />
                  </View>
                  <Text className="text-ash font-montserrat text-[11px]">
                    Mantenela por debajo del 5% para evitar penalizaciones en el sistema.
                  </Text>
                </LiquidGlassContainer>

                {/* Stats Grid: Trips & Earnings */}
                <View className="flex-row gap-3 mb-4">
                  <LiquidGlassContainer
                    variant="default"
                    className="flex-1 p-4 rounded-2xl"
                  >
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="car-outline" size={17} color={THEME_COLORS.gold} />
                      <Text className="text-ash font-montserrat text-xs ml-1.5 uppercase">Viajes Hoy</Text>
                    </View>
                    <Text 
                      style={{ fontVariant: ['tabular-nums'] }}
                      className="text-white font-montserrat-bold text-2xl"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {currentStats.completedTripsToday}
                    </Text>
                    <Text className="text-ash/70 font-montserrat text-[11px] mt-1">Completados</Text>
                  </LiquidGlassContainer>

                  <LiquidGlassContainer
                    variant={isNegative ? 'danger' : 'gold'}
                    className="flex-1 p-4 rounded-2xl"
                  >
                    <View className="flex-row items-center mb-1">
                      <Ionicons 
                        name={isNegative ? 'warning-outline' : 'wallet-outline'} 
                        size={17} 
                        color={isNegative ? '#F87171' : THEME_COLORS.gold} 
                      />
                      <Text className={`font-montserrat text-xs ml-1.5 uppercase ${
                        isNegative ? 'text-red-300' : 'text-ash'
                      }`} numberOfLines={1}>
                        {isNegative ? 'Saldo Actual' : 'Ganancias Hoy'}
                      </Text>
                    </View>
                    <Text 
                      style={{ fontVariant: ['tabular-nums'] }}
                      className={`font-montserrat-bold text-xl ${
                        isNegative ? 'text-red-400' : 'text-white'
                      }`}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {isNegative 
                        ? `-$${Math.abs(currentStats.balance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` 
                        : `$${(currentStats.balance > 0 ? currentStats.balance : currentStats.earningsToday).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                    </Text>
                    <Text className={`font-montserrat text-[11px] mt-1 ${
                      isNegative ? 'text-red-300/80' : 'text-ash/70'
                    }`} numberOfLines={1}>
                      {isNegative ? 'Deuda comisiones' : 'Total turno'}
                    </Text>
                  </LiquidGlassContainer>
                </View>

                {/* Tips Card */}
                <LiquidGlassContainer
                  variant="default"
                  className="p-4 rounded-2xl"
                >
                  <View className="flex-row items-center mb-1.5">
                    <Ionicons name="bulb-outline" size={17} color={THEME_COLORS.gold} />
                    <Text className="text-gold font-montserrat-bold text-xs ml-1.5 uppercase tracking-wider">
                      Consejo VIP para tus ingresos
                    </Text>
                  </View>
                  <Text className="text-ash font-montserrat text-xs leading-5">
                    Conducir en horarios pico (de 7 a 10 y de 18 a 21) incrementa la demanda de clientes corporativos en zonas ejecutivas.
                  </Text>
                </LiquidGlassContainer>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

