import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
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
import { useTripSocket } from '../../presentation/trip/hooks/useTripSocket';
import { useDriverTripStore } from '../../presentation/trip/store/useDriverTripStore';
import { ActiveTripOverlay } from '../../presentation/components/trip/ActiveTripOverlay';
import { ActiveTripTopHeader } from '../../presentation/components/trip/ActiveTripTopHeader';
import { getTripById } from '../../core/trip/actions/trip.actions';
import { TripReceiptModal } from '../../presentation/components/trip/TripReceiptModal';

export default function DriverDashboardScreen() {
  const logout = useAuthStore(state => state.logout);
  const activeTrip = useDriverTripStore(state => state.activeTrip);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isSecurityModalVisible, setIsSecurityModalVisible] = useState(false);
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);
  const [bottomHeight, setBottomHeight] = useState(100);

  const { location, errorMsg } = useDriverLocation(isAvailable || !!activeTrip);
  const { stats } = useDashboardStats(isAvailable);

  // Inicializa la escucha de eventos de socket (trip:offer)
  useTripSocket();

  // Manejo declarativo de la conexión del socket (activo si está disponible o en viaje)
  useEffect(() => {
    let isCancelled = false;

    const manageSocketConnection = async () => {
      if (isAvailable || !!activeTrip) {
        const token = await authStorage.getAccessToken();
        if (token && !isCancelled) {
          socket.auth = { token };
          if (!socket.connected) {
            socket.connect();
          }
        }
      } else {
        if (socket.connected) {
          socket.disconnect();
        }
      }
    };

    manageSocketConnection();

    return () => {
      isCancelled = true;
    };
  }, [isAvailable, !!activeTrip]);

  // Sincroniza el estado del viaje activo con el backend al abrir o montar la app
  useEffect(() => {
    if (!activeTrip?.id) return;

    let isMounted = true;
    const syncTrip = async () => {
      try {
        const freshTrip = await getTripById(activeTrip.id);
        if (!isMounted) return;

        if (freshTrip.status === 'cancelled') {
          useDriverTripStore.getState().setActiveTrip(null);
          Alert.alert(
            'Viaje no disponible',
            `El viaje fue cancelado.`,
            [{ text: 'Entendido' }]
          );
        } else if (freshTrip.status !== activeTrip.status) {
          useDriverTripStore.getState().updateTripStatus(freshTrip.status);
        }
      } catch (err: any) {
        // Si el viaje no se encuentra (404), limpiamos el estado local
        if (err?.message?.includes('no encontrado') || err?.response?.status === 404) {
          useDriverTripStore.getState().setActiveTrip(null);
        }
      }
    };

    syncTrip();

    return () => {
      isMounted = false;
    };
  }, [activeTrip?.id]);

  const toggleAvailability = (value: boolean) => {
    setIsAvailable(value);
  };

  const handleLogout = async () => {
    setIsAvailable(false);
    socket.disconnect();
    useDriverTripStore.getState().setActiveTrip(null);
    await logout();
    router.replace('/auth/login' as any);
  };

  // Coordenadas por defecto (ej. centro de Buenos Aires) si aún no hay ubicación
  const defaultLocation = { latitude: -34.6037, longitude: -58.3816 };

  return (
    <View className="flex-1 bg-obsidian">
      <StatusBar style="light" />

      {/* Map Content */}
      <View className="flex-1" style={{ flex: 1 }}>
        <CustomMap
          initialLocation={location || defaultLocation}
          showUserLocation={true}
          bottomOffset={bottomHeight}
          style={{ flex: 1 }}
        />
        {errorMsg && (
          <View className="absolute top-20 self-center bg-red-600/90 px-4 py-2 rounded-full z-50 shadow-md shadow-black">
            <Text className="text-white text-xs font-montserrat-semibold">{errorMsg}</Text>
          </View>
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
          {!activeTrip && (
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
          )}

          {activeTrip && (
            <ActiveTripTopHeader trip={activeTrip} />
          )}

          <TouchableOpacity
            onPress={() => router.push('/profile' as any)}
            className="w-10 h-10 rounded-full bg-obsidian/80 items-center justify-center border border-charcoal shadow-sm shadow-black"
          >
            <Ionicons name="person-outline" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>
        </View>

        {/* Dashboard Carousel */}
        {isStatsExpanded && !activeTrip && (
          <DashboardCarousel 
            stats={stats || undefined} 
            onPressProgress={() => setIsProgressModalVisible(true)}
          />
        )}
      </SafeAreaView>

      {activeTrip && activeTrip.status !== 'completed' ? (
        <ActiveTripOverlay trip={activeTrip} onHeightChange={setBottomHeight} />
      ) : !activeTrip || activeTrip.status === 'completed' ? (
        <>
          {/* Emergency Button */}
          <EmergencyFAB 
            onPress={() => setIsSecurityModalVisible(true)} 
            bottomOffset={bottomHeight}
          />

          {/* Bottom Sheet for Connection */}
          <ConnectionBottomSheet 
            isAvailable={isAvailable} 
            onToggleAvailability={toggleAvailability} 
            onHeightChange={setBottomHeight}
          />
        </>
      ) : null}

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

      {/* Trip Receipt Modal */}
      {activeTrip && (
        <TripReceiptModal 
          trip={activeTrip} 
          visible={activeTrip.status === 'completed'} 
        />
      )}
    </View>
  );
}