import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME_COLORS } from '@/core/constants/theme';
import {
  followPeerAlert,
  unfollowPeerAlert,
} from '@/core/safety/actions/peerAlert.actions';
import { useLocationStore } from '@/presentation/maps/store/useLocationStore';
import { usePeerAlertStore } from '@/presentation/safety/store/usePeerAlertStore';
import { useBannerNotificationStore } from '@/presentation/notifications/store/useBannerNotificationStore';

const openExternalNavigation = async (lat: number, lng: number): Promise<void> => {
  const url = Platform.select({
    ios: `maps://?daddr=${lat},${lng}&dirflg=d`,
    android: `google.navigation:q=${lat},${lng}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  });
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  try {
    if (url && (await Linking.canOpenURL(url))) {
      await Linking.openURL(url);
      return;
    }
    await Linking.openURL(fallbackUrl);
  } catch {
    // Ignorar si no hay app de mapas disponible
  }
};

export const PeerAlertModals: React.FC = () => {
  const insets = useSafeAreaInsets();
  const location = useLocationStore((state) => state.lastKnownLocation);
  const incomingAlert = usePeerAlertStore((state) => state.incomingAlert);
  const followingAlert = usePeerAlertStore((state) => state.followingAlert);
  const setIncomingAlert = usePeerAlertStore((state) => state.setIncomingAlert);
  const setFollowingAlert = usePeerAlertStore((state) => state.setFollowingAlert);
  const showBanner = useBannerNotificationStore((state) => state.show);

  const [isFollowingBusy, setIsFollowingBusy] = useState(false);

  const handleFollow = async (): Promise<void> => {
    if (!incomingAlert || isFollowingBusy) return;

    try {
      setIsFollowingBusy(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const response = await followPeerAlert(incomingAlert.alertId, {
        lat: location?.latitude,
        lng: location?.longitude,
      });

      setFollowingAlert({
        alertId: response.alertId,
        driverId: response.driverId,
        driverName: response.driverName,
        vehicleLabel: response.vehicleLabel,
        plate: response.plate,
        lat: response.lat,
        lng: response.lng,
        updatedAt: new Date().toISOString(),
      });
      setIncomingAlert(null);

      void openExternalNavigation(response.lat, response.lng);
    } catch {
      showBanner({
        title: 'No se pudo conectar',
        message: 'La alerta ya no está activa o hubo un problema de conexión.',
        type: 'error',
      });
      setIncomingAlert(null);
    } finally {
      setIsFollowingBusy(false);
    }
  };

  const handleStopFollowing = async (): Promise<void> => {
    if (!followingAlert || isFollowingBusy) return;
    const alertId = followingAlert.alertId;
    try {
      setIsFollowingBusy(true);
      await unfollowPeerAlert(alertId);
    } catch {
      // Limpiar estado local igualmente
    } finally {
      setFollowingAlert(null);
      setIsFollowingBusy(false);
    }
  };

  return (
    <>
      {/* Modal de alerta entrante para compañeros cercanos */}
      <Modal
        visible={!!incomingAlert}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIncomingAlert(null)}
      >
        <View className="flex-1 bg-black/80 justify-center px-5">
          <View className="w-full max-w-[380px] self-center rounded-3xl bg-[#11131A] border border-gold/40 p-6">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-gold/15 items-center justify-center mr-3.5">
                <Ionicons name="shield-half" size={24} color={THEME_COLORS.gold} />
              </View>
              <View className="flex-1">
                <Text className="text-gold font-montserrat-bold text-[11px] uppercase tracking-widest">
                  Respaldo en ruta
                </Text>
                <Text className="text-white font-montserrat-bold text-base mt-0.5">
                  Un compañero pidió retaguardia
                </Text>
              </View>
            </View>

            {incomingAlert && (
              <View className="border-t border-b border-white/[0.08] py-3.5 mb-5 gap-1.5">
                <Text className="text-white font-montserrat-semibold text-sm">
                  {incomingAlert.driverName}
                </Text>
                {(incomingAlert.vehicleLabel || incomingAlert.plate) && (
                  <Text className="text-white/65 font-montserrat text-xs">
                    {[incomingAlert.vehicleLabel, incomingAlert.plate]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                )}
                <Text
                  className="text-gold font-montserrat-semibold text-xs mt-1"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  A {incomingAlert.distanceKm.toFixed(1)} km de tu posición
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                void handleFollow();
              }}
              disabled={isFollowingBusy}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Seguir al compañero como retaguardia"
              className="w-full h-[52px] rounded-2xl bg-gold items-center justify-center flex-row"
            >
              {isFollowingBusy ? (
                <ActivityIndicator size="small" color="#0A0A0C" />
              ) : (
                <>
                  <Ionicons
                    name="navigate"
                    size={18}
                    color="#0A0A0C"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-obsidian font-montserrat-bold text-sm">
                    Seguir (Retaguardia)
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIncomingAlert(null)}
              disabled={isFollowingBusy}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Descartar alerta de respaldo"
              className="w-full min-h-[44px] items-center justify-center mt-1.5"
            >
              <Text className="text-white/50 font-montserrat-medium text-xs">
                Ahora no puedo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Banner flotante compacto mientras estás haciendo retaguardia */}
      {followingAlert && (
        <View
          className="absolute left-4 right-4 z-[120]"
          style={{ top: Math.max(insets.top, 12) + 8 }}
        >
          <View className="rounded-2xl bg-[#11131A] border border-gold/40 px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-gold font-montserrat-bold text-[10px] uppercase tracking-widest">
                Siguiendo en retaguardia
              </Text>
              <Text numberOfLines={1} className="text-white font-montserrat-semibold text-sm mt-0.5">
                {followingAlert.driverName}
                {followingAlert.plate ? ` · ${followingAlert.plate}` : ''}
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => {
                  void openExternalNavigation(followingAlert.lat, followingAlert.lng);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Abrir ruta hacia el compañero"
                className="w-11 h-11 rounded-full bg-gold items-center justify-center"
              >
                <Ionicons name="navigate" size={18} color="#0A0A0C" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  void handleStopFollowing();
                }}
                disabled={isFollowingBusy}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Dejar de seguir al compañero"
                className="w-11 h-11 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
};
