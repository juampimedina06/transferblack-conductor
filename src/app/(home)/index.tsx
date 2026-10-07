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
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useDriverLocation } from '../../presentation/maps/hooks/useDriverLocation';
import { DashboardCarousel } from '../../presentation/components/dashboard/DashboardCarousel';
import { EmergencyFAB } from '../../presentation/components/dashboard/EmergencyFAB';
import { ConnectionBottomSheet } from '../../presentation/components/dashboard/ConnectionBottomSheet';
import { SecurityModal } from '../../presentation/components/dashboard/SecurityModal';
import { DriverProgressModal } from '../../presentation/components/dashboard/DriverProgressModal';
import { useDashboardStats } from '../../presentation/hooks/useDashboardStats';
import { useTripSocket } from '../../presentation/trip/hooks/useTripSocket';
import { useTripTelemetry } from '../../presentation/trip/hooks/useTripTelemetry';
import { useActiveTripSync } from '../../presentation/trip/hooks/useActiveTripSync';
import { useDriverTripStore } from '../../presentation/trip/store/useDriverTripStore';
import { ActiveTripOverlay } from '../../presentation/components/trip/ActiveTripOverlay';
import { ActiveTripTopHeader } from '../../presentation/components/trip/ActiveTripTopHeader';
import { TripReceiptModal } from '../../presentation/components/trip/TripReceiptModal';
import { SosConfirmationModal } from '../../presentation/components/safety/SosConfirmationModal';
import { useWalletStore } from '../../presentation/wallet/store/useWalletStore';
import { pushNotificationService } from '../../core/push/services/pushNotificationService';
import { DispatchSuspensionBanner } from '../../presentation/components/dashboard/DispatchSuspensionBanner';
import { ComplianceRenewalBanner } from '../../presentation/components/compliance/ComplianceRenewalBanner';
import { useDriverStatusStore } from '../../presentation/driver/store/useDriverStatusStore';

export default function DriverDashboardScreen() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const activeTrip = useDriverTripStore(state => state.activeTrip);
  const isAvailable = useDriverTripStore(state => state.isAvailable);
  const setIsAvailable = useDriverTripStore(state => state.setIsAvailable);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isSecurityModalVisible, setIsSecurityModalVisible] = useState(false);
  const [isProgressModalVisible, setIsProgressModalVisible] = useState(false);
  // Estado asociado al tripId: al cambiar el viaje queda inválido solo, sin efectos de reset.
  const [sosOpenTripId, setSosOpenTripId] = useState<string | null>(null);
  const [bottomHeight, setBottomHeight] = useState(100);

  const hasActiveTrip = !!activeTrip;
  const activeTripId = activeTrip?.id ?? null;

  const { location, errorMsg } = useDriverLocation(isAvailable || hasActiveTrip);
  const { stats } = useDashboardStats(isAvailable);
  const { summary, fetchSummary } = useWalletStore();

  useEffect(() => {
    fetchSummary();
    void pushNotificationService.initialize();
    void useDriverStatusStore.getState().fetchStatus();
    const cleanupSocket = useDriverStatusStore.getState().initSocketListeners();
    return () => {
      cleanupSocket();
    };
  }, [fetchSummary]);

  // Inicializa la escucha de eventos de socket (trip:offer)
  useTripSocket();
  useTripTelemetry();

  // Manejo declarativo de la conexión del socket (activo si está disponible o en viaje)
  useEffect(() => {
    let isCancelled = false;

    const manageSocketConnection = async () => {
      if (isAvailable || hasActiveTrip) {
        const token = await authStorage.getAccessToken();
        if (token && !isCancelled) {
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
    await pushNotificationService.revoke();

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
        
        {/* Banner de suspensión temporal de despacho por cancelaciones */}
        <DispatchSuspensionBanner />

        {/* Banner de renovación de documentación próxima a vencer (15 días) */}
        <ComplianceRenewalBanner />

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
          {/* Logout Button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleLogout();
            }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-12 h-12 rounded-2xl bg-[#13141E] items-center justify-center border border-white/25 shadow-xl shadow-black relative overflow-hidden active:scale-95"
          >
            <View className="absolute top-0 left-2 right-2 h-[1px] bg-white/20 pointer-events-none" />
            <Ionicons name="log-out-outline" size={21} color={THEME_COLORS.ash} />
          </TouchableOpacity>

          {/* Central Toggle Pill & Navigation Controls */}
          {!activeTrip && (() => {
            const displayBalance = stats?.balance ?? 0;
            const isNegative = displayBalance < 0;
            const formattedAmount = isNegative
              ? `-$${Math.abs(displayBalance).toFixed(2)}`
              : `$${(displayBalance > 0 ? displayBalance : (stats?.earningsToday ?? 0)).toFixed(2)}`;

            return (
              <View className="flex-row items-center gap-2">
                {/* Bóveda Financiera */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/wallet' as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Ir a la Bóveda"
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  className="w-12 h-12 rounded-2xl bg-[#13141E] items-center justify-center border border-gold/55 shadow-xl shadow-black relative overflow-hidden active:scale-95"
                >
                  <View className="absolute top-0 left-2 right-2 h-[1px] bg-gold/50 pointer-events-none" />
                  <View className="w-8 h-8 rounded-xl bg-gold/20 items-center justify-center">
                    <Ionicons name="wallet" size={17} color={THEME_COLORS.gold} />
                  </View>
                  {summary?.pending_payout && (
                    <View className="w-2.5 h-2.5 rounded-full bg-amber-400 absolute top-2 right-2 border border-[#13141E]" />
                  )}
                </TouchableOpacity>

                {/* Pill Central: Ganancias / Saldo */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsStatsExpanded(!isStatsExpanded);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Desplegar estadísticas de hoy"
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  className={`h-12 flex-row items-center px-3.5 rounded-2xl shadow-xl shadow-black border relative overflow-hidden active:scale-98 ${
                    isNegative 
                      ? 'bg-[#2A0F12] border-red-500/70' 
                      : 'bg-[#13141E] border-gold/55'
                  }`}
                >
                  <View className="absolute top-0 left-3 right-3 h-[1px] bg-white/20 pointer-events-none" />
                  <View className={`w-7 h-7 rounded-lg items-center justify-center mr-2 ${isNegative ? 'bg-red-500/25' : 'bg-gold/20'}`}>
                    <Ionicons 
                      name={isNegative ? 'warning' : 'cash'} 
                      size={15} 
                      color={isNegative ? '#F87171' : THEME_COLORS.gold} 
                    />
                  </View>
                  <Text 
                    style={{ fontVariant: ['tabular-nums'] }}
                    className={`font-montserrat-bold text-sm mr-2 ${
                      isNegative ? 'text-red-400' : 'text-white'
                    }`}
                  >
                    {formattedAmount}
                  </Text>
                  <Ionicons
                    name={isStatsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color={isNegative ? '#FCA5A5' : THEME_COLORS.gold}
                  />
                </TouchableOpacity>

                {/* Reservas Programadas */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/(home)/scheduled-trips' as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Ver mis reservas programadas"
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  className="w-12 h-12 rounded-2xl bg-[#13141E] items-center justify-center border border-white/25 shadow-xl shadow-black relative overflow-hidden active:scale-95"
                >
                  <View className="absolute top-0 left-2 right-2 h-[1px] bg-white/20 pointer-events-none" />
                  <View className="w-8 h-8 rounded-xl bg-white/10 items-center justify-center">
                    <Ionicons name="calendar" size={17} color={THEME_COLORS.gold} />
                  </View>
                </TouchableOpacity>
              </View>
            );
          })()}

          {activeTrip && (
            <ActiveTripTopHeader trip={activeTrip} />
          )}

          {/* Perfil del Conductor */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(home)/profile' as any);
            }}
            accessibilityRole="button"
            accessibilityLabel="Ver perfil del conductor"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-12 h-12 rounded-2xl bg-[#13141E] items-center justify-center border border-gold/55 shadow-xl shadow-black relative overflow-hidden active:scale-95"
          >
            <View className="absolute top-0 left-2 right-2 h-[1px] bg-gold/50 pointer-events-none" />
            {user?.avatar_url ? (
              <Image 
                source={{ uri: user.avatar_url }} 
                className="w-full h-full rounded-2xl" 
                contentFit="cover"
              />
            ) : (
              <View className="w-8 h-8 rounded-xl bg-gold/20 items-center justify-center">
                <Text className="text-gold font-montserrat-bold text-sm">
                  {user?.first_name?.charAt(0).toUpperCase() || 'C'}
                </Text>
              </View>
            )}
            {/* Status Online Micro-Badge */}
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute bottom-1 right-1 border-2 border-[#13141E]" />
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
      ) : (
        /* Bottom Sheet for Connection */
        <ConnectionBottomSheet
          isAvailable={isAvailable}
          onToggleAvailability={toggleAvailability}
          onHeightChange={setBottomHeight}
        />
      )}

      {/* Escudo de funciones de seguridad: flota siempre por encima de la tarjeta, lado izquierdo */}
      <EmergencyFAB
        onPress={() => setIsSecurityModalVisible(true)}
        bottomOffset={bottomHeight}
      />

      {/* Security Functions Modal */}
      <SecurityModal
        visible={isSecurityModalVisible}
        onClose={() => setIsSecurityModalVisible(false)}
        onEmergencySos={
          activeTrip && activeTrip.status !== 'completed'
            ? () => {
                setIsSecurityModalVisible(false);
                setSosOpenTripId(activeTrip.id);
              }
            : undefined
        }
      />

      {/* Modal SOS: 911 + alerta registrada en backend con la ubicación del viaje */}
      {activeTrip && activeTrip.status !== 'completed' && (
        <SosConfirmationModal
          visible={sosOpenTripId === activeTripId}
          tripId={activeTrip.id}
          fallbackLocation={location}
          onClose={() => setSosOpenTripId(null)}
        />
      )}

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