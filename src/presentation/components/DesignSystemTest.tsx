import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

export const DesignSystemTest = () => {
  return (
    <ScrollView className="flex-1 bg-obsidian p-6">
      <View className="mb-6 border-b border-charcoal pb-4">
        <Text className="h1 text-platinum mb-2">Design System</Text>
        <Text className="body-regular text-ash">
          Prueba visual de tokens de diseño y tipografía Montserrat.
        </Text>
      </View>

      {/* Tipografía */}
      <View className="mb-8 rounded-xl border border-charcoal bg-obsidian p-4">
        <Text className="caption text-gold uppercase tracking-wider mb-4">
          Jerarquía Tipográfica
        </Text>

        <View className="gap-y-3">
          <Text className="h1 text-platinum">H1 - Bold (36-48px)</Text>
          <Text className="h2 text-platinum">H2 - Bold (24-30px)</Text>
          <Text className="h3 text-platinum">H3 - SemiBold (18-20px)</Text>
          <Text className="body-large text-platinum">
            Body Large - Medium (16px)
          </Text>
          <Text className="body-large-bold text-platinum">
            Body Large Bold - Bold (16px)
          </Text>
          <Text className="body-regular text-ash">
            Body Regular - Regular (14px)
          </Text>
          <Text className="caption text-ash">Caption - Regular (12px)</Text>
          <Text className="caption-medium text-ash">
            Caption Medium - Medium (12px)
          </Text>
        </View>
      </View>

      {/* Colores */}
      <View className="mb-8 rounded-xl border border-charcoal bg-obsidian p-4">
        <Text className="caption text-gold uppercase tracking-wider mb-4">
          Paleta de Colores
        </Text>

        <View className="gap-y-2">
          <View className="flex-row items-center justify-between rounded-lg border border-charcoal p-3">
            <Text className="body-regular text-platinum">Obsidian (#0A0A0C)</Text>
            <View className="h-6 w-12 rounded border border-charcoal bg-obsidian" />
          </View>

          <View className="flex-row items-center justify-between rounded-lg border border-charcoal p-3">
            <Text className="body-regular text-platinum">Gold (#D4AF37)</Text>
            <View className="h-6 w-12 rounded bg-gold" />
          </View>

          <View className="flex-row items-center justify-between rounded-lg border border-charcoal p-3">
            <Text className="body-regular text-platinum">Platinum (#E4E4E5)</Text>
            <View className="h-6 w-12 rounded bg-platinum" />
          </View>

          <View className="flex-row items-center justify-between rounded-lg border border-charcoal p-3">
            <Text className="body-regular text-platinum">Ash (#8E8E93)</Text>
            <View className="h-6 w-12 rounded bg-ash" />
          </View>

          <View className="flex-row items-center justify-between rounded-lg border border-charcoal p-3">
            <Text className="body-regular text-platinum">Charcoal (#2C2C2E)</Text>
            <View className="h-6 w-12 rounded bg-charcoal" />
          </View>
        </View>
      </View>

      {/* Botón de Acción (Gold) */}
      <TouchableOpacity
        activeOpacity={0.8}
        className="mb-10 items-center justify-center rounded-xl bg-gold py-4 shadow-sm"
      >
        <Text className="body-large-bold text-obsidian">
          Botón de Acción (Gold)
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
