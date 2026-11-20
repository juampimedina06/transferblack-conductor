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
      <View className="rounded-2xl bg-[#12131A] border border-white/10 px-4 py-4 flex-row items-center">
        <View className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center mr-3.5">
          <Ionicons name="car-sport-outline" size={20} color={THEME_COLORS.ash} />
        </View>
        <View className="flex-1">
          <Text className="text-platinum font-montserrat-semibold text-sm">
            Sin vehículo asignado
          </Text>
          <Text className="text-ash font-montserrat text-xs mt-0.5 leading-4">
            Contactá a soporte para vincular tu unidad.
          </Text>
        </View>
      </View>
    );
  }

  const details = [
    vehicle.year ? String(vehicle.year) : null,
    vehicle.color || null,
    vehicle.vehicleType || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="rounded-2xl bg-[#12131A] border border-white/10 px-4 py-4 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1 mr-3">
        <View className="w-10 h-10 rounded-xl bg-white/[0.05] items-center justify-center mr-3.5">
          <Ionicons name="car-sport-outline" size={20} color={THEME_COLORS.gold} />
        </View>
        <View className="flex-1">
          <Text
            className="text-white font-montserrat-semibold text-base"
            numberOfLines={1}
          >
            {vehicle.brand} {vehicle.model}
          </Text>
          {details ? (
            <Text className="text-ash font-montserrat text-xs mt-0.5 capitalize" numberOfLines={1}>
              {details}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="px-3 py-1.5 rounded-lg bg-obsidian border border-white/15">
        <Text
          className="text-platinum font-montserrat-bold text-xs tracking-widest uppercase"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {vehicle.plate}
        </Text>
      </View>
    </View>
  );
}
