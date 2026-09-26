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
import { useDriverLocation } from '../../presentation/maps/hooks/useDriverLocation';
import { DashboardCarousel } from '../../presentation/components/dashboard/DashboardCarousel';
import { EmergencyFAB } from '../../presentation/components/dashboard/EmergencyFAB';
import { ConnectionBottomSheet } from '../../presentation/components/dashboard/ConnectionBottomSheet';
import { SecurityModal } from '../../presentation/components/dashboard/SecurityModal';
import { DriverProgressModal } from '../../presentation/components/dashboard/DriverProgressModal';
import { useDashboardStats } from '../../presentation/hooks/useDashboardStats';

export default function DriverDashboardScreen() {
  const logout = useAuthStore(state => state.logout);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isSecurityModalVisible, setIsSecurityModalVisible] = useState(false);
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);

  const { location, errorMsg } = useDriverLocation(isAvailable);
  const { stats } = useDashboardStats(isAvailable);

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
            initialLocation={location ? location : defaultLocation}
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
            className="w-10 h-10 rounded-full bg-obsidian/80 items-center justify-center border border-charcoal shadow-sm shadow-black"
          >
            <Ionicons name="log-out-outline" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>

          {/* Central Toggle Pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsStatsExpanded(!isStatsExpanded)}
            className="flex-row items-center bg-obsidian/90 border border-charcoal px-4 py-2 rounded-full shadow-md shadow-black"
          >
            <Ionicons name="wallet-outline" size={16} color={THEME_COLORS.gold} />
            <Text className="text-platinum font-montserrat-bold text-sm ml-2 mr-1.5">
              ${stats ? stats.earningsToday.toFixed(2) : '0.00'}
            </Text>
            <Ionicons
              name={isStatsExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={THEME_COLORS.ash}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/profile' as any)}
            className="w-10 h-10 rounded-full bg-obsidian/80 items-center justify-center border border-charcoal shadow-sm shadow-black"
          >
            <Ionicons name="person-outline" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>
        </View>

        {/* Dashboard Carousel */}
        {isStatsExpanded && (
          <DashboardCarousel 
            stats={stats || undefined} 
            onPressProgress={() => setIsProgressModalVisible(true)}
          />
        )}
      </SafeAreaView>

      {/* Emergency Button */}
      <EmergencyFAB onPress={() => setIsSecurityModalVisible(true)} />

      {/* Bottom Sheet for Connection */}
      <ConnectionBottomSheet 
        isAvailable={isAvailable} 
        onToggleAvailability={toggleAvailability} 
      />

      {/* Security Functions Modal */}
      <SecurityModal 
        visible={isSecurityModalVisible} 
        onClose={() => setIsSecurityModalVisible(false)} 
      />

      {/* Driver Progress & Performance Modal */}
      <DriverProgressModal 
        visible={isProgressModalVisible} 
        stats={stats || undefined} 
        onClose={() => setIsProgressModalVisible(false)} 
      />
    </View>
  );
}