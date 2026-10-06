import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';

import { THEME_COLORS } from '@/core/constants/theme';
import { socket } from '@/core/socket/socket';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { useDriverTripStore } from '@/presentation/trip/store/useDriverTripStore';
import { getDriverMe } from '@/core/driver/actions/driver.actions';
import { ProfileSkeleton } from '@/presentation/components/profile/ProfileSkeleton';
import { VehicleCard } from '@/presentation/components/profile/VehicleCard';
import { ProfileOptionItem } from '@/presentation/components/profile/ProfileOptionItem';
import { usePushNotifications } from '@/presentation/hooks/usePushNotifications';
import { pushNotificationService } from '@/core/push/services/pushNotificationService';

export default function DriverProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);
  const setIsAvailable = useDriverTripStore((state) => state.setIsAvailable);

  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Hook para acceder al estado y acciones de notificaciones push
  const { isRegistered: isPushRegistered, syncDeviceToken, expoPushToken, isExpoGoOnAndroid } =
    usePushNotifications();

  // Consulta del perfil del conductor y vehículo asignado (GET /api/v1/driver/me)
  const {
    data: driverData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['driver', 'me'],
    queryFn: getDriverMe,
    staleTime: 1000 * 60 * 3, // 3 minutos
  });

  const driverProfile = driverData?.driverProfile;
  const vehicle = driverData?.vehicle ?? null;

  // Rating formateado
  const ratingAverage = driverProfile?.ratingAverage
    ? driverProfile.ratingAverage.toFixed(1)
    : '5.0';
  const ratingCount = driverProfile?.ratingCount ?? 0;

  // Nombre y Avatar del usuario
  const fullName =
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Conductor';
  const avatarUrl = user?.avatar_url;
  const driverEmail = user?.email || '';

  // Flujo técnico de cierre de sesión
  const performLogout = async () => {
    try {
      setIsLoggingOut(true);

      // 1. Desconectar Socket (informa al backend que el chofer pasa a OFFLINE)
      setIsAvailable(false);
      if (socket.connected) {
        socket.disconnect();
      }

      // 2. Limpieza local de viajes activos (salvo que sea un viaje en curso que deba persistirse)
      const currentTrip = useDriverTripStore.getState().activeTrip;
      const isTripLive =
        !!currentTrip &&
        currentTrip.status !== 'completed' &&
        currentTrip.status !== 'cancelled';

      if (!isTripLive) {
        useDriverTripStore.getState().setActiveTrip(null);
      }

      // 3. Revocar push token en backend
      await pushNotificationService.revoke();

      // 4. Invalidar Refresh Token en la API y purgar credenciales de SecureStore + Zustand
      await logout();

      // 4. Redirección limpia al Stack de Login impidiendo volver atrás
      router.replace('/auth/login' as any);
    } catch (err) {
      console.error('Error durante el cierre de sesión:', err);
      // Aun con error, asegurar salida al login
      router.replace('/auth/login' as any);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutPress = () => {
    const isTripLive =
      !!activeTrip &&
      activeTrip.status !== 'completed' &&
      activeTrip.status !== 'cancelled';

    if (isTripLive) {
      Alert.alert(
        'Tenés un viaje en curso',
        'Si cerrás sesión, el viaje seguirá asignado en el servidor y continuará activo cuando vuelvas a ingresar.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar sesión de todos modos',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas desconectarte y cerrar tu sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const handleDocumentsPress = () => {
    Alert.alert(
      'Mis Documentos',
      'Tu documentación operativa (Licencia, Seguro, ITV) fue aprobada por el equipo de administración. Para renovar o actualizar algún documento, contactá a soporte.',
      [{ text: 'Entendido' }]
    );
  };

  const handleSupportPress = () => {
    Alert.alert(
      'Soporte TransferBlack',
      'Centro de atención a conductores disponible 24/7.\n\nLínea exclusiva: +54 9 351 000-0000\nCorreo: soporte@transferblack.com',
      [{ text: 'Aceptar' }]
    );
  };

  const handleSettingsPress = () => {
    const pushStatusText = isPushRegistered
      ? 'Activas y vinculadas al servidor'
      : isExpoGoOnAndroid
      ? 'Requiere Development Build en Android (no disponible en Expo Go SDK 53+)'
      : 'Pendientes de activación';

    const tokenPreview = expoPushToken
      ? `${expoPushToken.slice(0, 28)}...`
      : isExpoGoOnAndroid
      ? 'No disponible en Expo Go'
      : 'No detectado';

    Alert.alert(
      'Configuración',
      `Versión de la app: 1.0.0\nToken Push: ${tokenPreview}\nNotificaciones: ${pushStatusText}\nEntorno: ${
        isExpoGoOnAndroid ? 'Expo Go (Android)' : 'Desarrollo / Producción'
      }`,
      [
        {
          text: isPushRegistered || isExpoGoOnAndroid ? 'Cerrar' : 'Activar Notificaciones',
          onPress: () => syncDeviceToken(undefined, true),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-obsidian">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Navigation Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-white/[0.08]">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Volver a la pantalla principal"
              className="w-10 h-10 rounded-full bg-charcoal items-center justify-center border border-charcoal mr-3 shadow-sm shadow-black"
            >
              <Ionicons name="arrow-back" size={20} color={THEME_COLORS.platinum} />
            </TouchableOpacity>
            <View>
              <Text className="text-white font-montserrat-bold text-lg">
                Mi Cuenta
              </Text>
              <Text className="text-zinc-400 font-montserrat text-xs">
                Perfil operativo y vehículo
              </Text>
            </View>
          </View>

          {/* Quick status pill */}
          <View className="flex-row items-center bg-[#1A1A1C] border border-[#2C2C2E] px-2.5 py-1 rounded-full">
            <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
            <Text className="text-zinc-300 font-montserrat-medium text-xs">
              Chofer
            </Text>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <ProfileSkeleton />
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-14 h-14 rounded-full bg-red-950/60 border border-red-500/30 items-center justify-center mb-3">
              <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
            </View>
            <Text className="text-white font-montserrat-bold text-base mb-1 text-center">
              No se pudo cargar el perfil
            </Text>
            <Text className="text-ash font-montserrat text-xs text-center mb-4 leading-relaxed">
              Ocurrió un inconveniente al consultar los datos del conductor. Verificá tu conexión a internet.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => refetch()}
              className="bg-charcoal border border-[#3A3A3C] px-5 py-2.5 rounded-xl"
            >
              <Text className="text-platinum font-montserrat-semibold text-xs">
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={THEME_COLORS.gold}
                colors={[THEME_COLORS.gold]}
              />
            }
          >
            {/* Header: Avatar, Name & Rating */}
            <View className="items-center py-3 mb-5">
              {/* Avatar */}
              <View className="w-24 h-24 rounded-full bg-[#1A1A1C] border-2 border-[#D4AF37]/50 items-center justify-center overflow-hidden mb-3 shadow-md shadow-black">
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-charcoal">
                    <Text className="text-gold font-montserrat-bold text-2xl">
                      {fullName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Full Name */}
              <Text className="text-white font-montserrat-bold text-xl text-center mb-0.5">
                {fullName}
              </Text>

              {/* Email / ID */}
              {driverEmail ? (
                <Text className="text-ash font-montserrat text-xs text-center mb-3">
                  {driverEmail}
                </Text>
              ) : null}

              {/* Rating Promedio Destacado en Oro Champán */}
              <View className="flex-row items-center bg-[#1A1A1C] border border-[#2C2C2E] px-4 py-1.5 rounded-full shadow-sm shadow-black mt-1">
                <Ionicons name="star" size={20} color="#D4AF37" />
                <Text className="text-gold font-montserrat-bold text-2xl ml-2 mr-2">
                  {ratingAverage}
                </Text>
                <View className="h-4 w-px bg-[#2C2C2E] mr-2" />
                <Text className="text-ash font-montserrat-medium text-xs">
                  {ratingCount} {ratingCount === 1 ? 'reseña' : 'calificaciones'}
                </Text>
              </View>
            </View>

            {/* Tarjeta Resumen de Vehículo Activo */}
            <View className="mb-6">
              <VehicleCard vehicle={vehicle} />
            </View>

            {/* Opciones (Glassmorphism) */}
            <View className="mb-8">
              <Text className="text-zinc-500 font-montserrat-semibold text-xs uppercase tracking-wider mb-3 px-1">
                Gestión y Preferencias
              </Text>
              
              <View className="space-y-2.5">
                <ProfileOptionItem
                  title="Mis Documentos"
                  subtitle="Licencia, cédula y seguro aprobados"
                  iconName="document-text-outline"
                  onPress={handleDocumentsPress}
                  badge="Verificado"
                />

                <ProfileOptionItem
                  title="Soporte y Asistencia"
                  subtitle="Canal directo para conductores 24/7"
                  iconName="headset-outline"
                  onPress={handleSupportPress}
                />

                <ProfileOptionItem
                  title="Configuración"
                  subtitle="Notificaciones, permisos y app"
                  iconName="settings-outline"
                  onPress={handleSettingsPress}
                  badge={isPushRegistered ? 'Push OK' : undefined}
                />
              </View>
            </View>

            {/* Botón de Cierre de Sesión */}
            <View className="pt-2">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLogoutPress}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
                className="w-full bg-[#1A1A1C]/90 border border-red-900/40 rounded-2xl py-4 flex-row items-center justify-center space-x-2"
              >
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text className="text-[#FF3B30] font-montserrat-semibold text-sm ml-2">
                  {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
