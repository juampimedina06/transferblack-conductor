import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '@/core/constants/theme';
import { DriverVehicle } from '@/core/driver/interface/driver.interface';

interface VehicleCardProps {
  vehicle: DriverVehicle | null;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  if (!vehicle) {
    return (
      <View className="bg-[#1A1A1C] border border-[#2C2C2E] rounded-2xl p-5 items-center justify-center">
        <View className="w-12 h-12 rounded-full bg-charcoal/50 items-center justify-center mb-2.5">
          <Ionicons name="car-outline" size={26} color={THEME_COLORS.ash} />
        </View>
        <Text className="text-platinum font-montserrat-semibold text-sm mb-1 text-center">
          Sin vehículo asignado
        </Text>
        <Text className="text-ash font-montserrat text-xs text-center px-4 leading-relaxed">
          Contactá a administración para registrar y habilitar tu vehículo en la plataforma.
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-[#1A1A1C] border border-[#2C2C2E] rounded-2xl p-4 shadow-sm shadow-black">
      {/* Top Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center space-x-2">
          <Ionicons name="car-sport" size={18} color={THEME_COLORS.gold} />
          <Text className="text-zinc-400 font-montserrat-medium text-xs ml-1.5 uppercase tracking-wider">
            Vehículo Activo
          </Text>
        </View>
        <View className="bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full">
          <Text className="text-emerald-400 font-montserrat-semibold text-[10px] uppercase">
            Habilitado
          </Text>
        </View>
      </View>

      {/* Main Vehicle Info */}
      <View className="mb-3">
        <Text className="text-white font-montserrat-bold text-lg">
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text className="text-ash font-montserrat text-xs mt-0.5">
          {vehicle.year ? `Año ${vehicle.year}` : ''} {vehicle.color ? `• Color ${vehicle.color}` : ''}
        </Text>
      </View>

      {/* Plate and Specs Badge */}
      <View className="pt-2 border-t border-[#2C2C2E]/60 flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2">
          <Text className="text-zinc-500 font-montserrat-medium text-xs mr-2">
            Patente
          </Text>
          <View className="bg-obsidian border border-[#3A3A3C] px-3 py-1 rounded-md">
            <Text className="text-platinum font-montserrat-bold text-xs tracking-widest uppercase">
              {vehicle.plate}
            </Text>
          </View>
        </View>

        {vehicle.vehicleType && (
          <Text className="text-zinc-400 font-montserrat text-xs capitalize">
            {vehicle.vehicleType}
          </Text>
        )}
      </View>
    </View>
  );
}
