import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { transferApi } from '@/core/api/transferApi';
import type { UserProfileResponse } from '@/core/auth/interface/auth.interface';
import { THEME_COLORS } from '@/core/constants/theme';
import { socket } from '@/core/socket/socket';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { useDriverTripStore } from '@/presentation/trip/store/useDriverTripStore';
import { getDriverMe } from '@/core/driver/actions/driver.actions';
import { ProfileAvatarImage } from '@/presentation/components/profile/ProfileAvatarImage';
import { ProfileSkeleton } from '@/presentation/components/profile/ProfileSkeleton';
import { VehicleCard } from '@/presentation/components/profile/VehicleCard';
import { ProfileOptionItem } from '@/presentation/components/profile/ProfileOptionItem';
import { DriverDocumentsModal } from '@/presentation/components/compliance/DriverDocumentsModal';
import { DeleteAccountModal } from '@/presentation/components/profile/DeleteAccountModal';
import { usePushNotifications } from '@/presentation/hooks/usePushNotifications';
import { useProfileAvatar } from '@/presentation/profile/hooks/useProfileAvatar';
import {
  DRIVER_PRIVACY_URL,
  DRIVER_TERMS_URL,
  openLegalUrl,
} from '@/core/legal/constants/legalUrls.constants';

export default function DriverProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);
  const setIsAvailable = useDriverTripStore((state) => state.setIsAvailable);

  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isDocsModalVisible, setIsDocsModalVisible] = useState<boolean>(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);

  const {
    isUploading,
    isDeleting,
    pickAndUploadAvatar,
    removeAvatar,
    refreshAvatarUrl,
    cancelUpload,
  } = useProfileAvatar();

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
  const isAvatarBusy = isUploading || isDeleting;

  const handleRefresh = async (): Promise<void> => {
    await Promise.all([
      refetch(),
      transferApi
        .get<UserProfileResponse>('/users/me')
        .then((res) => updateUser(res.data))
        .catch(() => undefined),
    ]);
  };

  const handleAvatarPress = (): void => {
    if (isAvatarBusy) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options: {
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }[] = [
      {
        text: 'Tomar foto',
        onPress: () => void pickAndUploadAvatar('camera'),
      },
      {
        text: 'Elegir de la galería',
        onPress: () => void pickAndUploadAvatar('library'),
      },
    ];

    if (avatarUrl) {
      options.push({
        text: 'Eliminar foto actual',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Eliminar foto de perfil',
            '¿Estás seguro de que querés quitar tu foto de perfil?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () => void removeAvatar(),
              },
            ],
          );
        },
      });
    }

    options.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(
      'Foto de perfil',
      'Elegí cómo querés actualizar tu foto de perfil.',
      options,
    );
  };

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
      'Cerrar sesión',
      '¿Estás seguro de que querés desconectarte y cerrar tu sesión?',
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
          text: isPushRegistered || isExpoGoOnAndroid ? 'Cerrar' : 'Activar notificaciones',
          onPress: () => {
            if (!isPushRegistered && !isExpoGoOnAndroid) {
              void syncDeviceToken(undefined, true);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-obsidian">
      <StatusBar style="light" />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header limpio y minimalista */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Volver a la pantalla principal"
            className="w-11 h-11 rounded-full bg-white/[0.06] items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>

          <Text className="text-white font-montserrat-semibold text-base">
            Perfil
          </Text>

          <View className="w-11" />
        </View>

        {/* Content */}
        {isLoading ? (
          <ProfileSkeleton />
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="rounded-2xl p-6 bg-[#12131A] border border-white/10 items-center w-full max-w-[340px]">
              <Ionicons name="alert-circle-outline" size={32} color="#F87171" />
              <Text className="text-white font-montserrat-semibold text-base mt-3 mb-1 text-center">
                No se pudo cargar el perfil
              </Text>
              <Text className="text-ash font-montserrat text-xs text-center mb-5 leading-5">
                Revisá tu conexión a internet e intentá nuevamente.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  void refetch();
                }}
                className="bg-gold w-full py-3.5 rounded-xl items-center justify-center"
              >
                <Text className="text-obsidian font-montserrat-bold text-xs uppercase tracking-wider">
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => {
                  void handleRefresh();
                }}
                tintColor={THEME_COLORS.gold}
                colors={[THEME_COLORS.gold]}
              />
            }
          >
            {/* Identidad abierta sobre el fondo (sin tarjeta pesada) */}
            <View className="items-center pt-2 pb-6">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleAvatarPress}
                disabled={isAvatarBusy}
                accessibilityRole="button"
                accessibilityLabel="Cambiar foto de perfil"
                className="relative mb-4"
              >
                <View className="w-24 h-24 rounded-full p-0.5 border border-gold/60 bg-[#12131A] overflow-hidden items-center justify-center">
                  <View className="w-full h-full rounded-full overflow-hidden items-center justify-center relative">
                    <ProfileAvatarImage
                      avatarUrl={avatarUrl}
                      expiresAt={user?.avatar_url_expires_at}
                      initials={fullName.slice(0, 2).toUpperCase()}
                      initialsClassName="text-gold font-montserrat-bold text-2xl"
                      onRefreshUrl={refreshAvatarUrl}
                    />
                    {isAvatarBusy && (
                      <View className="absolute inset-0 bg-black/70 items-center justify-center">
                        <ActivityIndicator size="small" color={THEME_COLORS.gold} />
                      </View>
                    )}
                  </View>
                </View>

                <View className="absolute bottom-0 right-0 bg-gold border-2 border-obsidian w-7 h-7 rounded-full items-center justify-center">
                  <Ionicons name="camera" size={13} color="#0A0A0C" />
                </View>
              </TouchableOpacity>

              {isUploading && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={cancelUpload}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar subida de foto"
                  className="mb-2 px-3 py-1 rounded-full bg-white/10"
                >
                  <Text className="text-platinum font-montserrat-medium text-xs">
                    Subiendo foto... Cancelar
                  </Text>
                </TouchableOpacity>
              )}

              <Text className="text-white font-montserrat-bold text-2xl text-center">
                {fullName}
              </Text>
              {driverEmail ? (
                <Text className="text-ash font-montserrat text-xs text-center mt-1">
                  {driverEmail}
                </Text>
              ) : null}

              {/* Métricas limpias sin caja extra */}
              <View className="flex-row items-center justify-center mt-6 pt-5 border-t border-white/[0.08] w-full">
                <View className="flex-1 items-center">
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={14} color={THEME_COLORS.gold} />
                    <Text
                      className="text-white font-montserrat-bold text-lg ml-1"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {ratingAverage}
                    </Text>
                  </View>
                  <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                    Calificación
                  </Text>
                </View>

                <View className="w-[1px] h-7 bg-white/10" />

                <View className="flex-1 items-center">
                  <Text
                    className="text-white font-montserrat-bold text-lg"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {ratingCount}
                  </Text>
                  <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                    {ratingCount === 1 ? 'Evaluación' : 'Evaluaciones'}
                  </Text>
                </View>

                <View className="w-[1px] h-7 bg-white/10" />

                <View className="flex-1 items-center">
                  <Text className="text-gold font-montserrat-bold text-sm uppercase tracking-wider">
                    Black
                  </Text>
                  <Text className="text-ash font-montserrat text-[11px] mt-1">
                    Categoría
                  </Text>
                </View>
              </View>
            </View>

            {/* Sección Vehículo */}
            <View className="mb-6">
              <Text className="text-ash font-montserrat-semibold text-[11px] uppercase tracking-widest mb-2.5 px-1">
                Vehículo
              </Text>
              <VehicleCard vehicle={vehicle} />
            </View>

            {/* Sección Cuenta — Lista agrupada limpia estilo iOS / Uber */}
            <View className="mb-8">
              <Text className="text-ash font-montserrat-semibold text-[11px] uppercase tracking-widest mb-2.5 px-1">
                Cuenta y preferencias
              </Text>
              <View className="rounded-2xl bg-[#12131A] border border-white/10 overflow-hidden">
                <ProfileOptionItem
                  title="Mis documentos"
                  subtitle="Licencia, seguro y habilitaciones"
                  iconName="document-text-outline"
                  onPress={handleDocumentsPress}
                  badge="Al día"
                  showDivider
                />
                <ProfileOptionItem
                  title="Soporte 24/7"
                  subtitle="Atención para conductores"
                  iconName="headset-outline"
                  onPress={handleSupportPress}
                  showDivider
                />
                <ProfileOptionItem
                  title="Notificaciones y app"
                  subtitle="Estado de alertas y versión"
                  iconName="notifications-outline"
                  onPress={handleSettingsPress}
                  badge={isPushRegistered ? 'Activas' : undefined}
                  showDivider
                />
                <ProfileOptionItem
                  title="Política de privacidad"
                  subtitle="Uso de datos, ubicación y permisos"
                  iconName="shield-checkmark-outline"
                  onPress={() => {
                    void openLegalUrl(DRIVER_PRIVACY_URL);
                  }}
                  showDivider
                />
                <ProfileOptionItem
                  title="Términos y condiciones"
                  subtitle="Condiciones para conductores"
                  iconName="document-outline"
                  onPress={() => {
                    void openLegalUrl(DRIVER_TERMS_URL);
                  }}
                />
              </View>
            </View>

            {/* Acciones de sesión sobrias */}
            <View>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={handleLogoutPress}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
                className="w-full py-3.5 rounded-2xl bg-white/[0.04] border border-red-500/30 flex-row items-center justify-center mb-3"
              >
                <Ionicons name="log-out-outline" size={18} color="#F87171" />
                <Text className="text-red-400 font-montserrat-semibold text-sm ml-2">
                  {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsDeleteModalVisible(true)}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityLabel="Eliminar cuenta"
                className="w-full py-2.5 items-center justify-center"
              >
                <Text className="text-zinc-500 font-montserrat text-xs">
                  Eliminar cuenta
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
