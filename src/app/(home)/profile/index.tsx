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
import * as Haptics from 'expo-haptics';

import { THEME_COLORS } from '@/core/constants/theme';
import { socket } from '@/core/socket/socket';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { useDriverTripStore } from '@/presentation/trip/store/useDriverTripStore';
import { getDriverMe } from '@/core/driver/actions/driver.actions';
import { ProfileSkeleton } from '@/presentation/components/profile/ProfileSkeleton';
import { VehicleCard } from '@/presentation/components/profile/VehicleCard';
import { ProfileOptionItem } from '@/presentation/components/profile/ProfileOptionItem';
import { DriverDocumentsModal } from '@/presentation/components/compliance/DriverDocumentsModal';
import { DeleteAccountModal } from '@/presentation/components/profile/DeleteAccountModal';
import { usePushNotifications } from '@/presentation/hooks/usePushNotifications';
import { LiquidGlassContainer } from '@/presentation/components/ui/LiquidGlassContainer';
import { AmbientGlow } from '@/presentation/components/ui/AmbientGlow';

export default function DriverProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);
  const setIsAvailable = useDriverTripStore((state) => state.setIsAvailable);

  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isDocsModalVisible, setIsDocsModalVisible] = useState<boolean>(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);

  const { isRegistered: isPushRegistered, syncDeviceToken, expoPushToken, isExpoGoOnAndroid } =
    usePushNotifications({ enableListeners: false });

  const {
    data: driverData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['driver', 'me'],
    queryFn: getDriverMe,
    staleTime: 1000 * 60 * 3,
  });

  const driverProfile = driverData?.driverProfile;
  const vehicle = driverData?.vehicle ?? null;

  const ratingAverage = driverProfile?.ratingAverage
    ? driverProfile.ratingAverage.toFixed(1)
    : '5.0';
  const ratingCount = driverProfile?.ratingCount ?? 0;

  const fullName =
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Conductor Ejecutivo';
  const avatarUrl = user?.avatar_url;
  const driverEmail = user?.email || '';

  const performLogout = async (): Promise<void> => {
    try {
      setIsLoggingOut(true);

      setIsAvailable(false);
      if (socket.connected) {
        socket.disconnect();
      }

      const currentTrip = useDriverTripStore.getState().activeTrip;
      const isTripLive =
        !!currentTrip &&
        currentTrip.status !== 'completed' &&
        currentTrip.status !== 'cancelled';

      if (!isTripLive) {
        useDriverTripStore.getState().setActiveTrip(null);
      }

      await logout();

      router.replace('/auth/login' as any);
    } catch (err) {
      console.error('Error durante el cierre de sesión:', err);
      router.replace('/auth/login' as any);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutPress = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const handleDocumentsPress = (): void => {
    setIsDocsModalVisible(true);
  };

  const handleSupportPress = (): void => {
    Alert.alert(
      'Soporte TransferBlack',
      'Centro de atención a conductores disponible 24/7.\n\nLínea exclusiva: +54 9 351 000-0000\nCorreo: soporte@transferblack.com',
      [{ text: 'Aceptar' }]
    );
  };

  const handleSettingsPress = (): void => {
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

      {/* Top Ambient Champagne Gold Glow */}
      <AmbientGlow color="#D4AF37" position="top" height={360} opacity={0.18} />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Executive Navigation Header */}
        <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-white/10">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Volver a la pantalla principal"
              className="w-11 h-11 rounded-2xl bg-[#13141E] border border-gold/40 items-center justify-center mr-3.5 shadow-lg shadow-black active:scale-95"
            >
              <Ionicons name="arrow-back" size={20} color={THEME_COLORS.gold} />
            </TouchableOpacity>
            <View>
              <Text className="text-gold font-montserrat-bold text-[10px] uppercase tracking-widest mb-0.5">
                CREDENCIAL OPERATIVA
              </Text>
              <Text className="text-white font-montserrat-bold text-xl">
                Mi Perfil VIP
              </Text>
            </View>
          </View>

          {/* Quick VIP Status Pill */}
          <View className="flex-row items-center bg-gold/15 border border-gold/45 px-3 py-1.5 rounded-full">
            <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
            <Text className="text-gold font-montserrat-bold text-[11px] uppercase tracking-wider">
              Chofer VIP
            </Text>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <ProfileSkeleton />
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6">
            <LiquidGlassContainer
              variant="danger"
              className="rounded-3xl p-7 items-center justify-center w-full max-w-[340px]"
            >
              <View className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/40 items-center justify-center mb-4">
                <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
              </View>
              <Text className="text-white font-montserrat-bold text-base mb-1.5 text-center">
                No se pudo cargar el perfil
              </Text>
              <Text className="text-ash font-montserrat text-xs text-center mb-5 leading-5">
                Ocurrió un inconveniente al consultar los datos del conductor. Verificá tu conexión a internet.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => refetch()}
                className="bg-gold w-full py-3.5 rounded-2xl items-center justify-center"
              >
                <Text className="text-obsidian font-montserrat-bold text-xs uppercase tracking-widest">
                  Reintentar
                </Text>
              </TouchableOpacity>
            </LiquidGlassContainer>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 44 }}
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
            {/* VIP Chauffeur Credential Hero Card */}
            <LiquidGlassContainer
              variant="gold"
              className="rounded-[32px] p-6 mb-6 border border-gold/40"
            >
              <View className="items-center">
                {/* Double-Ring Champagne Gold Avatar Bezel */}
                <View className="relative mb-3.5">
                  <View className="w-28 h-28 rounded-full p-1 bg-gold/20 border-2 border-gold shadow-xl shadow-black items-center justify-center">
                    <View className="w-full h-full rounded-full bg-[#13141E] overflow-hidden items-center justify-center">
                      {avatarUrl ? (
                        <Image
                          source={{ uri: avatarUrl }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <Text className="text-gold font-montserrat-bold text-3xl">
                          {fullName.slice(0, 2).toUpperCase()}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Floating Verified Emblem */}
                  <View className="absolute -bottom-1 right-0 bg-gold border-2 border-[#0A0A0C] w-8 h-8 rounded-full items-center justify-center shadow-md shadow-black">
                    <Ionicons name="shield-checkmark" size={16} color="#0A0A0C" />
                  </View>
                </View>

                {/* Micro Badge */}
                <View className="bg-white/[0.06] border border-white/15 px-3 py-0.5 rounded-full mb-2">
                  <Text className="text-gold font-montserrat-bold text-[9px] uppercase tracking-widest">
                    TRANSFERBLACK EXECUTIVE DRIVER
                  </Text>
                </View>

                {/* Full Name */}
                <Text className="text-white font-montserrat-bold text-2xl text-center mb-0.5">
                  {fullName}
                </Text>

                {/* Email */}
                {driverEmail ? (
                  <Text className="text-ash font-montserrat text-xs text-center mb-5">
                    {driverEmail}
                  </Text>
                ) : (
                  <View className="mb-4" />
                )}

                {/* 3-Column VIP Telemetry Metrics Strip */}
                <View className="w-full flex-row items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl py-3.5 px-2">
                  {/* Metric 1: Rating */}
                  <View className="flex-1 items-center">
                    <View className="flex-row items-center mb-0.5">
                      <Ionicons name="star" size={16} color={THEME_COLORS.gold} />
                      <Text
                        className="text-white font-montserrat-bold text-xl ml-1"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {ratingAverage}
                      </Text>
                    </View>
                    <Text className="text-ash font-montserrat-semibold text-[10px] uppercase tracking-wider">
                      Calificación
                    </Text>
                  </View>

                  <View className="w-[1px] h-8 bg-white/10" />

                  {/* Metric 2: Reviews */}
                  <View className="flex-1 items-center">
                    <Text
                      className="text-gold font-montserrat-bold text-xl mb-0.5"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {ratingCount}
                    </Text>
                    <Text className="text-ash font-montserrat-semibold text-[10px] uppercase tracking-wider">
                      {ratingCount === 1 ? 'Reseña' : 'Evaluaciones'}
                    </Text>
                  </View>

                  <View className="w-[1px] h-8 bg-white/10" />

                  {/* Metric 3: Tier */}
                  <View className="flex-1 items-center">
                    <View className="flex-row items-center mb-0.5">
                      <Ionicons name="diamond" size={15} color={THEME_COLORS.gold} />
                      <Text className="text-white font-montserrat-bold text-sm ml-1 uppercase">
                        BLACK
                      </Text>
                    </View>
                    <Text className="text-ash font-montserrat-semibold text-[10px] uppercase tracking-wider">
                      Categoría
                    </Text>
                  </View>
                </View>
              </View>
            </LiquidGlassContainer>

            {/* Tarjeta Resumen de Vehículo Activo */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between px-1 mb-2.5">
                <Text className="text-gold/90 font-montserrat-bold text-[11px] uppercase tracking-widest">
                  Mi Unidad Asignada
                </Text>
                <Text className="text-ash font-montserrat text-[11px]">
                  Flota Oficial
                </Text>
              </View>
              <VehicleCard vehicle={vehicle} />
            </View>

            {/* Opciones de Gestión y Preferencias */}
            <View className="mb-6">
              <Text className="text-gold/90 font-montserrat-bold text-[11px] uppercase tracking-widest mb-3 px-1">
                Gestión y Preferencias Ejecutivas
              </Text>

              <ProfileOptionItem
                title="Mis Documentos"
                subtitle="Licencia profesional, cédula y póliza"
                iconName="document-text-outline"
                onPress={handleDocumentsPress}
                badge="Verificado"
              />

              <ProfileOptionItem
                title="Mesa de Ayuda VIP 24/7"
                subtitle="Asistencia exclusiva para conductores"
                iconName="headset-outline"
                onPress={handleSupportPress}
              />

              <ProfileOptionItem
                title="Configuración del Sistema"
                subtitle="Notificaciones push, permisos y versión"
                iconName="settings-outline"
                onPress={handleSettingsPress}
                badge={isPushRegistered ? 'Push OK' : undefined}
              />
            </View>

            {/* Acciones de Cuenta */}
            <View className="pt-1">
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleLogoutPress}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
                className="w-full bg-red-950/35 border border-red-500/40 rounded-2xl py-4 flex-row items-center justify-center shadow-lg shadow-black mb-3 relative overflow-hidden"
              >
                <View
                  pointerEvents="none"
                  className="absolute top-0 left-6 right-6 h-[1px] bg-red-400/25"
                />
                <Ionicons name="log-out-outline" size={20} color="#F87171" />
                <Text className="text-red-400 font-montserrat-bold text-xs uppercase tracking-widest ml-2.5">
                  {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsDeleteModalVisible(true)}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityLabel="Eliminar cuenta"
                className="w-full py-3 items-center justify-center"
              >
                <Text className="text-zinc-500 font-montserrat-medium text-xs">
                  Solicitar baja y eliminar cuenta
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      <DriverDocumentsModal
        visible={isDocsModalVisible}
        onClose={() => setIsDocsModalVisible(false)}
      />

      <DeleteAccountModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
      />
    </View>
  );
}
