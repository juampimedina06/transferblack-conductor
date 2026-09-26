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
import { THEME_COLORS } from '../../../core/constants/theme';
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
  const currentStats = stats || {
    earningsToday: 0,
    completedTripsToday: 0,
    acceptanceRate: 100,
    cancellationRate: 0,
    rating: 5.0,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-[#1C1C1E] rounded-t-3xl border-t border-[#2C2C2E] max-h-[85%] pb-8 shadow-2xl">
              {/* Header */}
              <View className="px-5 pt-5 pb-3 flex-row items-center justify-between border-b border-[#2C2C2E]">
                <TouchableOpacity
                  onPress={onClose}
                  className="w-10 h-10 items-center justify-center rounded-full bg-[#2C2C2E]/60"
                  accessibilityLabel="Cerrar progreso"
                >
                  <Ionicons name="close" size={24} color={THEME_COLORS.platinum} />
                </TouchableOpacity>

                <Text className="text-platinum font-montserrat-bold text-lg text-center flex-1 pr-10">
                  Rendimiento y Progreso
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
              >
                {/* Rating Card */}
                <View className="bg-[#141416] p-4 rounded-2xl border border-[#2C2C2E] items-center mb-4">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="star" size={28} color={THEME_COLORS.gold} />
                    <Text className="text-platinum font-montserrat-bold text-3xl ml-2">
                      {currentStats.rating.toFixed(1)}
                    </Text>
                  </View>
                  <Text className="text-gold font-montserrat-semibold text-xs tracking-wider uppercase mb-1">
                    Conductor TransferBlack
                  </Text>
                  <Text className="text-ash font-montserrat text-xs text-center">
                    Excelente reputación. Los pasajeros valoran tu puntualidad y servicio.
                  </Text>
                </View>

                {/* Acceptance Rate Card */}
                <View className="bg-[#141416] p-4 rounded-2xl border border-[#2C2C2E] mb-3">
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle-outline" size={20} color="#4ADE80" />
                      <Text className="text-platinum font-montserrat-semibold text-sm ml-2">
                        Tasa de Aceptación
                      </Text>
                    </View>
                    <Text className="text-platinum font-montserrat-bold text-base">
                      {currentStats.acceptanceRate}%
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View className="h-2 w-full bg-[#2C2C2E] rounded-full overflow-hidden mb-2">
                    <View
                      style={{ width: `${Math.min(currentStats.acceptanceRate, 100)}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </View>
                  <Text className="text-ash/80 font-montserrat text-xs">
                    Meta recomendada: 80% o más para recibir asignaciones prioritarias.
                  </Text>
                </View>

                {/* Cancellation Rate Card */}
                <View className="bg-[#141416] p-4 rounded-2xl border border-[#2C2C2E] mb-3">
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center">
                      <Ionicons name="close-circle-outline" size={20} color="#F87171" />
                      <Text className="text-platinum font-montserrat-semibold text-sm ml-2">
                        Tasa de Cancelación
                      </Text>
                    </View>
                    <Text className="text-platinum font-montserrat-bold text-base">
                      {currentStats.cancellationRate}%
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View className="h-2 w-full bg-[#2C2C2E] rounded-full overflow-hidden mb-2">
                    <View
                      style={{ width: `${Math.min(currentStats.cancellationRate, 100)}%` }}
                      className="h-full bg-red-500 rounded-full"
                    />
                  </View>
                  <Text className="text-ash/80 font-montserrat text-xs">
                    Mantenela por debajo del 5% para evitar penalizaciones en el sistema.
                  </Text>
                </View>

                {/* Stats Grid: Trips & Earnings */}
                <View className="flex-row space-x-3 mb-4">
                  <View className="flex-1 bg-[#141416] p-4 rounded-2xl border border-[#2C2C2E] mr-2">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="car-outline" size={18} color={THEME_COLORS.gold} />
                      <Text className="text-ash font-montserrat text-xs ml-1.5">Viajes Hoy</Text>
                    </View>
                    <Text className="text-platinum font-montserrat-bold text-2xl">
                      {currentStats.completedTripsToday}
                    </Text>
                    <Text className="text-ash/70 font-montserrat text-[11px] mt-1">Completados</Text>
                  </View>

                  <View className="flex-1 bg-[#141416] p-4 rounded-2xl border border-[#2C2C2E] ml-2">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="wallet-outline" size={18} color={THEME_COLORS.gold} />
                      <Text className="text-ash font-montserrat text-xs ml-1.5">Ganancias Hoy</Text>
                    </View>
                    <Text className="text-platinum font-montserrat-bold text-2xl">
                      ${currentStats.earningsToday.toFixed(0)}
                    </Text>
                    <Text className="text-ash/70 font-montserrat text-[11px] mt-1">Total turno</Text>
                  </View>
                </View>

                {/* Tips Card */}
                <View className="bg-obsidian/60 p-4 rounded-2xl border border-[#2C2C2E]">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="bulb-outline" size={18} color={THEME_COLORS.gold} />
                    <Text className="text-gold font-montserrat-semibold text-xs ml-1.5 uppercase">
                      Consejo para mejorar tus ingresos
                    </Text>
                  </View>
                  <Text className="text-ash font-montserrat text-xs leading-5">
                    Conducir en horarios pico (de 7 a 10 y de 18 a 21) incrementa la demanda en zonas ejecutivas de la ciudad.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
