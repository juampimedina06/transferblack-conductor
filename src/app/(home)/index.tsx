import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME_COLORS } from '../../core/constants/theme';
import { socket } from '../../core/socket/socket';
import { authStorage } from '../../presentation/auth/store/authStorage';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { CustomMap } from '../../presentation/components/maps/CustomMap';
import { useDriverLocation } from '../../presentation/hooks/useDriverLocation';

export default function DriverDashboardScreen() {
  const logout = useAuthStore(state => state.logout);
  const [isAvailable, setIsAvailable] = useState(false);

  const { location, errorMsg } = useDriverLocation(isAvailable);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    if (value) {
      const token = await authStorage.getAccessToken();
      if (token) {
        socket.auth = { token };
        socket.connect();
      }
    } else {
      socket.disconnect();
    }
  };

  const handleLogout = async () => {
    if (isAvailable) {
      toggleAvailability(false);
    }
    await logout();
    router.replace('/auth/login' as any);
  };

  // Coordenadas por defecto (ej. centro de Buenos Aires) si aún no hay ubicación
  const defaultLocation = { latitude: -34.6037, longitude: -58.3816 };

  return (
    <View className="flex-1 bg-obsidian">
      <StatusBar style="light" />

      {/* Map Content */}
      <View className="flex-1">
        {!location && !errorMsg ? (
          <View className="flex-1 items-center justify-center bg-obsidian">
            <ActivityIndicator size="large" color={THEME_COLORS.gold} />
            <Text className="text-ash font-montserrat mt-4">Obteniendo ubicación...</Text>
          </View>
        ) : (
          <CustomMap
            initialLocation={location ? location.coords : defaultLocation}
            currentLocation={location}
            showUserLocation={true}
            style={{ flex: 1 }}
          />
        )}
      </View>

      {/* Top Navigation Overlay */}
      <SafeAreaView className="absolute top-0 w-full" edges={['top']} pointerEvents="box-none">
        <View className="px-4 py-3 flex-row items-center justify-between" pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleLogout}
            className="w-10 h-10 rounded-full bg-obsidian/80 items-center justify-center border border-charcoal"
          >
            <Ionicons name="log-out-outline" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>

          {/* Availability Toggle */}
          <View 
            className={`h-12 rounded-full flex-row items-center px-2 transition-all ${
              isAvailable ? 'bg-[#0A0A0C] border border-[#D4AF37]' : 'bg-[#1A1A1C] border border-[#2C2C2E]'
            }`}
          >
            <Text 
              className={`mr-3 ml-2 font-montserrat-semibold text-xs ${
                isAvailable ? 'text-[#D4AF37]' : 'text-ash/60'
              }`}
            >
              {isAvailable ? 'Disponible' : 'Desconectado'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={toggleAvailability}
              trackColor={{ false: THEME_COLORS.charcoal, true: 'rgba(212, 175, 55, 0.3)' }}
              thumbColor={isAvailable ? THEME_COLORS.gold : THEME_COLORS.ash}
              ios_backgroundColor={THEME_COLORS.charcoal}
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/profile' as any)}
            className="w-10 h-10 rounded-full bg-obsidian/80 items-center justify-center border border-charcoal"
          >
            <Ionicons name="person-outline" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>
        </View>

        {/* Quick Access Earnings */}
        <View className="items-center mt-2">
          <View className="bg-black/80 px-4 py-2 rounded-full border border-charcoal/50 flex-row items-center">
            <Ionicons name="wallet-outline" size={16} color={THEME_COLORS.gold} style={{ marginRight: 6 }} />
            <Text className="text-ash font-montserrat text-xs">Ganancia hoy: </Text>
            <Text className="text-gold font-montserrat-bold text-sm">$0.00</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}