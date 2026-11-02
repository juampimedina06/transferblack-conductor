import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '@/core/constants/theme';
import { DriverVehicle } from '@/core/driver/interface/driver.interface';
import { LiquidGlassContainer } from '@/presentation/components/ui/LiquidGlassContainer';

interface VehicleCardProps {
  vehicle: DriverVehicle | null;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  if (!vehicle) {
    return (
      <LiquidGlassContainer
        variant="default"
        className="rounded-[26px] p-6 items-center justify-center border border-white/10"
      >
        <View className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 items-center justify-center mb-3">
          <Ionicons name="car-sport-outline" size={28} color={THEME_COLORS.gold} />
        </View>
        <Text className="text-white font-montserrat-bold text-base mb-1 text-center">
          Sin unidad asignada
        </Text>
        <Text className="text-ash font-montserrat text-xs text-center px-4 leading-5">
          Contactá a la central ejecutiva de TransferBlack para vincular y habilitar tu vehículo en la flota.
        </Text>
      </LiquidGlassContainer>
    );
  }

  return (
    <LiquidGlassContainer
      variant="elevated"
      className="rounded-[28px] p-5 border border-white/15"
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between mb-4 pb-3.5 border-b border-white/10">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/40 items-center justify-center mr-3">
            <Ionicons name="car-sport" size={20} color={THEME_COLORS.gold} />
          </View>
          <View>
            <Text className="text-gold font-montserrat-bold text-[9px] uppercase tracking-widest mb-0.5">
              FLOTA TRANSFERBLACK
            </Text>
            <Text className="text-white font-montserrat-bold text-sm">
              Unidad Ejecutiva Activa
            </Text>
          </View>
        </View>

        <View className="flex-row items-center bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 rounded-full">
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
          <Text className="text-emerald-400 font-montserrat-bold text-[10px] uppercase tracking-wider">
            Habilitado
          </Text>
        </View>
      </View>

      {/* Main Vehicle Info & Plate */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1 mr-3">
          <Text className="text-white font-montserrat-bold text-xl leading-tight" numberOfLines={1}>
            {vehicle.brand} {vehicle.model}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2 mt-2">
            {vehicle.year ? (
              <View className="bg-white/[0.06] border border-white/10 px-2.5 py-1 rounded-lg">
                <Text className="text-platinum font-montserrat-medium text-[11px]">
                  Modelo {vehicle.year}
                </Text>
              </View>
            ) : null}
            {vehicle.color ? (
              <View className="bg-white/[0.06] border border-white/10 px-2.5 py-1 rounded-lg">
                <Text className="text-platinum font-montserrat-medium text-[11px] capitalize">
                  {vehicle.color}
                </Text>
              </View>
            ) : null}
            {vehicle.vehicleType ? (
              <View className="bg-gold/15 border border-gold/30 px-2.5 py-1 rounded-lg">
                <Text className="text-gold font-montserrat-semibold text-[11px] capitalize">
                  {vehicle.vehicleType}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Executive Metallic License Plate Badge */}
        <View className="bg-[#090A0F] border border-gold/45 rounded-xl overflow-hidden items-center min-w-[104px] shadow-md shadow-black">
          <View className="w-full bg-gold/20 py-0.5 px-2 items-center border-b border-gold/30">
            <Text className="text-gold font-montserrat-bold text-[7px] tracking-widest uppercase">
              DOMINIO OFICIAL
            </Text>
          </View>
          <View className="px-3 py-1.5 items-center justify-center">
            <Text className="text-white font-montserrat-bold text-sm tracking-widest uppercase">
              {vehicle.plate}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Fleet Status Bar */}
      <View className="flex-row items-center justify-between pt-3 border-t border-white/10">
        <View className="flex-row items-center">
          <Ionicons name="shield-checkmark" size={14} color={THEME_COLORS.gold} />
          <Text className="text-ash font-montserrat-medium text-xs ml-1.5">
            Inspección técnica y seguro al día
          </Text>
        </View>
        <Text className="text-gold/80 font-montserrat-bold text-[10px] uppercase tracking-wider">
          VIP CLASS
        </Text>
      </View>
    </LiquidGlassContainer>
  );
}
