import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
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
import { useActiveTripSync } from '../../presentation/trip/hooks/useActiveTripSync';
import { useDriverTripStore } from '../../presentation/trip/store/useDriverTripStore';
import { ActiveTripOverlay } from '../../presentation/components/trip/ActiveTripOverlay';
import { ActiveTripTopHeader } from '../../presentation/components/trip/ActiveTripTopHeader';
import { TripReceiptModal } from '../../presentation/components/trip/TripReceiptModal';
import { useWalletStore } from '../../presentation/wallet/store/useWalletStore';

export default function DriverDashboardScreen() {
  const logout = useAuthStore(state => state.logout);
  const activeTrip = useDriverTripStore(state => state.activeTrip);
  const isAvailable = useDriverTripStore(state => state.isAvailable);
  const setIsAvailable = useDriverTripStore(state => state.setIsAvailable);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isSecurityModalVisible, setIsSecurityModalVisible] = useState(false);
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);
  const [bottomHeight, setBottomHeight] = useState(100);

  const hasActiveTrip = !!activeTrip;

  const { location, errorMsg } = useDriverLocation(isAvailable || hasActiveTrip);
  const { stats } = useDashboardStats(isAvailable);
  const { summary, fetchSummary } = useWalletStore();

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Inicializa la escucha de eventos de socket (trip:offer)
  useTripSocket();

  // Manejo declarativo de la conexión del socket (activo si está disponible o en viaje)
  useEffect(() => {
    let isCancelled = false;

    const manageSocketConnection = async () => {
      if (isAvailable || hasActiveTrip) {
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
  }, [isAvailable, hasActiveTrip]);

  // Sincroniza el estado del viaje activo con GET /driver/me/active-trip al abrir o montar la app
  useActiveTripSync();

  const toggleAvailability = (value: boolean) => {
    setIsAvailable(value);
  };

  const performLogout = async () => {
    setIsAvailable(false);
    socket.disconnect();

    const trip = useDriverTripStore.getState().activeTrip;
    const isTripLive = !!trip && trip.status !== 'completed' && trip.status !== 'cancelled';

    // Un viaje en curso NO se borra. Es el unico id del viaje que la app tiene,
    // y no hay forma de recuperarlo si se pierde: no existe endpoint de "mi
    // viaje activo" para el conductor. El store esta persistido, asi que vuelve
    // al iniciar sesion y el sync de arriba lo resincroniza con el backend.
    // Borrarlo dejaba el viaje asignado en el servidor y al conductor sin
    // forma de sacarselo de encima. Un viaje ya terminado solo estorba: se limpia.
    if (!isTripLive) {
      useDriverTripStore.getState().setActiveTrip(null);
    }

    await logout();
    router.replace('/auth/login' as any);
  };

  const handleLogout = () => {
    const trip = activeTrip;
    const isTripLive = !!trip && trip.status !== 'completed' && trip.status !== 'cancelled';

    if (!isTripLive) {
      performLogout();
      return;
    }

    Alert.alert(
      'Tenés un viaje en curso',
      'Si cerrás sesión, el viaje sigue asignado y lo vas a tener al volver a entrar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: performLogout },
      ]
    );
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
        
        {/* Warning Banner */}
        {summary?.is_cash_restricted && (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => router.push('/wallet' as any)}
            className="w-full px-4 mb-2 z-50"
          >
            <View className="bg-red-600/95 rounded-xl p-3 shadow-md shadow-black flex-row items-center border border-red-800">
              <Ionicons name="warning" size={24} color="#FFF" />
              <Text className="text-white font-montserrat-medium text-xs ml-3 flex-1 leading-tight">
                Modo Restringido: Viajes en efectivo pausados por deuda. Toca aquí para ir a la Bóveda.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View className="px-4 py-3 flex-row items-center justify-between" pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleLogout}
            className="w-10 h-10 rounded-full bg-obsidian/80 items-center justify-center border border-charcoal shadow-sm shadow-black"
          >
            <Ionicons name="log-out-outline" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>

          {/* Central Toggle Pill */}
          {!activeTrip && (() => {
            const displayBalance = stats?.balance ?? 0;
            const isNegative = displayBalance < 0;
            const formattedAmount = isNegative
              ? `-$${Math.abs(displayBalance).toFixed(2)}`
              : `$${(displayBalance > 0 ? displayBalance : (stats?.earningsToday ?? 0)).toFixed(2)}`;

            return (
              <View className="flex-row items-center space-x-2">
                <TouchableOpacity
                  onPress={() => router.push('/wallet' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Ir a la Bóveda"
                  className="w-10 h-10 rounded-full bg-obsidian/90 items-center justify-center border border-charcoal shadow-sm shadow-black"
                >
                  <Ionicons name="card-outline" size={20} color={THEME_COLORS.gold} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsStatsExpanded(!isStatsExpanded)}
                  className={`flex-row items-center px-4 py-2 rounded-full shadow-md shadow-black border ${
                    isNegative 
                      ? 'bg-red-950/80 border-red-500/60' 
                      : 'bg-obsidian/90 border-charcoal'
                  }`}
                >
                  <Ionicons 
                    name={isNegative ? 'warning-outline' : 'cash-outline'} 
                    size={16} 
                    color={isNegative ? '#F87171' : THEME_COLORS.gold} 
                  />
                  <Text className={`font-montserrat-bold text-sm ml-2 mr-1.5 ${
                    isNegative ? 'text-red-400' : 'text-platinum'
                  }`}>
                    {formattedAmount}
                  </Text>
                  <Ionicons
                    name={isStatsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={isNegative ? '#FCA5A5' : THEME_COLORS.ash}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(home)/scheduled-trips' as any)}
                  accessibilityRole="button"
                  accessibilityLabel="Ver mis reservas programadas"
                  className="w-10 h-10 rounded-full bg-obsidian/90 items-center justify-center border border-charcoal shadow-sm shadow-black"
                >
                  <Ionicons name="calendar-outline" size={19} color={THEME_COLORS.gold} />
                </TouchableOpacity>
              </View>
            );
          })()}

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