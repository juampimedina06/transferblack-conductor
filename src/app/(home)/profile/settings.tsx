import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

import { THEME_COLORS } from '@/core/constants/theme';
import {
  checkBackgroundLocationPermission,
  requestBackgroundLocationPermission,
} from '@/core/location/actions/permissions.actions';
import { PermissionStatus } from '@/core/location/interface/permission.interface';
import { driverOverlay } from '@/core/overlay/driverOverlay';
import { usePushNotifications } from '@/presentation/hooks/usePushNotifications';
import {
  type OfferSoundTone,
  type PeerAlertRadiusKm,
  type VibrationIntensity,
  useDriverSettingsStore,
} from '@/presentation/settings/store/useDriverSettingsStore';
import { offerAlarmService } from '@/presentation/trip/services/offerAlarmService';

interface SettingToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  showDivider?: boolean;
}

const SettingToggleRow: React.FC<SettingToggleRowProps> = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  showDivider = false,
}) => (
  <View
    className={`flex-row items-center justify-between px-4 py-3.5 ${
      showDivider ? 'border-b border-white/[0.07]' : ''
    }`}
  >
    <View className="flex-row items-center flex-1 mr-3">
      <View className="w-9 h-9 rounded-xl bg-white/[0.06] items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color={THEME_COLORS.platinum} />
      </View>
      <View className="flex-1">
        <Text className="text-white font-montserrat-semibold text-sm">{title}</Text>
        <Text className="text-ash font-montserrat text-xs mt-0.5 leading-4">
          {subtitle}
        </Text>
      </View>
    </View>

    <Switch
      value={value}
      onValueChange={(next) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onValueChange(next);
      }}
      trackColor={{ false: '#27272A', true: 'rgba(212, 175, 55, 0.45)' }}
      thumbColor={value ? THEME_COLORS.gold : '#A1A1AA'}
      ios_backgroundColor="#27272A"
      accessibilityLabel={title}
    />
  </View>
);

interface PermissionStatusRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  statusLabel: string;
  isGranted: boolean;
  actionLabel: string;
  onPress: () => void;
  showDivider?: boolean;
}

const PermissionStatusRow: React.FC<PermissionStatusRowProps> = ({
  icon,
  title,
  statusLabel,
  isGranted,
  actionLabel,
  onPress,
  showDivider = false,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityLabel={`${title}: ${statusLabel}`}
    className={`flex-row items-center justify-between px-4 py-3.5 min-h-[56px] ${
      showDivider ? 'border-b border-white/[0.07]' : ''
    }`}
  >
    <View className="flex-row items-center flex-1 mr-3">
      <View className="w-9 h-9 rounded-xl bg-white/[0.06] items-center justify-center mr-3">
        <Ionicons
          name={icon}
          size={18}
          color={isGranted ? '#34D399' : THEME_COLORS.gold}
        />
      </View>
      <View className="flex-1">
        <Text className="text-white font-montserrat-semibold text-sm">{title}</Text>
        <Text
          className={`font-montserrat-medium text-xs mt-0.5 ${
            isGranted ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {statusLabel}
        </Text>
      </View>
    </View>

    <Text className="text-gold font-montserrat-semibold text-xs">{actionLabel}</Text>
  </TouchableOpacity>
);

const SOUND_TONE_OPTIONS: {
  value: OfferSoundTone;
  label: string;
  description: string;
}[] = [
  { value: 'transfer_black', label: 'Transfer Black', description: 'Tono principal' },
  { value: 'transfer_black_male', label: 'Transfer Black (Hombre)', description: 'Voz masculina secundaria' },
];

const VIBRATION_OPTIONS: { value: VibrationIntensity; label: string }[] = [
  { value: 'subtle', label: 'Suave' },
  { value: 'normal', label: 'Normal' },
  { value: 'strong', label: 'Intensa' },
];

const RADIUS_OPTIONS: { value: PeerAlertRadiusKm; label: string }[] = [
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
];

export default function DriverSettingsScreen(): React.JSX.Element {
  const settings = useDriverSettingsStore();
  const { isRegistered: isPushRegistered, syncDeviceToken, isExpoGoOnAndroid } =
    usePushNotifications({ enableListeners: false });

  const [bgLocationGranted, setBgLocationGranted] = useState<boolean>(false);
  const [overlayGranted, setOverlayGranted] = useState<boolean>(false);
  const [isTestingAlert, setIsTestingAlert] = useState<boolean>(false);

  const refreshSystemPermissions = useCallback(async () => {
    const bgStatus = await checkBackgroundLocationPermission();
    setBgLocationGranted(bgStatus === PermissionStatus.GRANTED);

    if (Platform.OS === 'android') {
      const canDraw = await driverOverlay.canDrawOverlays();
      setOverlayGranted(canDraw);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadPermissions = async () => {
      const bgStatus = await checkBackgroundLocationPermission();
      if (!isCancelled) {
        setBgLocationGranted(bgStatus === PermissionStatus.GRANTED);
      }
      if (Platform.OS === 'android') {
        const canDraw = await driverOverlay.canDrawOverlays();
        if (!isCancelled) {
          setOverlayGranted(canDraw);
        }
      }
    };

    void loadPermissions();

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void loadPermissions();
      }
    });

    return () => {
      isCancelled = true;
      sub.remove();
    };
  }, []);

  const handleTestOfferAlert = async (): Promise<void> => {
    if (isTestingAlert) return;
    setIsTestingAlert(true);
    try {
      await offerAlarmService.testAlert({
        vibrate: settings.offerVibrationEnabled,
        intensity: settings.offerVibrationIntensity,
        sound: settings.offerSoundEnabled,
        tone: settings.offerSoundTone,
      });
    } finally {
      setTimeout(() => {
        setIsTestingAlert(false);
      }, 1500);
    }
  };

  const handleResetDefaults = (): void => {
    Alert.alert(
      'Restablecer configuración',
      '¿Querés volver todas las preferencias a sus valores predeterminados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            settings.resetToDefaults();
          },
        },
      ]
    );
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View className="flex-1 bg-obsidian">
      <StatusBar style="light" />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header limpio */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Volver al perfil"
            className="w-11 h-11 rounded-full bg-white/[0.06] items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>

          <Text className="text-white font-montserrat-semibold text-base">
            Configuración
          </Text>

          <View className="w-11" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. ALERTAS DE VIAJE */}
          <View className="mb-6">
            <Text className="text-ash font-montserrat-semibold text-[11px] uppercase tracking-widest mb-2.5 px-1">
              Alertas de viaje
            </Text>
            <View className="rounded-2xl bg-[#12131A] border border-white/10 overflow-hidden">
              <SettingToggleRow
                icon="volume-high-outline"
                title="Sonido al recibir oferta"
                subtitle="Tono de aviso cuando entra una solicitud de viaje"
                value={settings.offerSoundEnabled}
                onValueChange={(val) => settings.setSetting('offerSoundEnabled', val)}
                showDivider
              />

              {settings.offerSoundEnabled && (
                <View className="px-4 py-3.5 border-b border-white/[0.07]">
                  <Text className="text-white/80 font-montserrat-medium text-xs mb-2.5">
                    Tono exclusivo Transfer Black
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {SOUND_TONE_OPTIONS.map((option) => {
                      const selected = settings.offerSoundTone === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            settings.setSetting('offerSoundTone', option.value);
                            void offerAlarmService.testAlert({
                              vibrate: false,
                              intensity: settings.offerVibrationIntensity,
                              sound: true,
                              tone: option.value,
                            });
                          }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`${option.label}: ${option.description}`}
                          className={`w-[48%] min-h-[54px] px-3 py-2 rounded-xl justify-center border ${
                            selected
                              ? 'bg-gold/15 border-gold/60'
                              : 'bg-white/[0.04] border-white/10'
                          }`}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text
                              className={`font-montserrat-semibold text-xs ${
                                selected ? 'text-gold' : 'text-white/85'
                              }`}
                            >
                              {option.label}
                            </Text>
                            <Ionicons
                              name={selected ? 'volume-high' : 'play-outline'}
                              size={13}
                              color={selected ? THEME_COLORS.gold : 'rgba(255,255,255,0.45)'}
                            />
                          </View>
                          <Text
                            className="text-ash font-montserrat text-[10px] mt-0.5"
                            numberOfLines={1}
                          >
                            {option.description}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <SettingToggleRow
                icon="phone-portrait-outline"
                title="Vibración al recibir oferta"
                subtitle="Vibra mientras tenés una solicitud pendiente"
                value={settings.offerVibrationEnabled}
                onValueChange={(val) => settings.setSetting('offerVibrationEnabled', val)}
                showDivider
              />

              {settings.offerVibrationEnabled && (
                <View className="px-4 py-3.5 border-b border-white/[0.07]">
                  <Text className="text-white/80 font-montserrat-medium text-xs mb-2.5">
                    Intensidad de vibración
                  </Text>
                  <View className="flex-row gap-2">
                    {VIBRATION_OPTIONS.map((option) => {
                      const selected = settings.offerVibrationIntensity === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            settings.setSetting('offerVibrationIntensity', option.value);
                          }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          className={`flex-1 h-10 rounded-xl items-center justify-center border ${
                            selected
                              ? 'bg-gold/15 border-gold/60'
                              : 'bg-white/[0.04] border-white/10'
                          }`}
                        >
                          <Text
                            className={`font-montserrat-semibold text-xs ${
                              selected ? 'text-gold' : 'text-white/65'
                            }`}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {Platform.OS === 'android' && (
                <SettingToggleRow
                  icon="layers-outline"
                  title="Tarjeta flotante de oferta"
                  subtitle="Muestra la oferta encima de Waze o WhatsApp"
                  value={settings.offerOverlayEnabled}
                  onValueChange={(val) => settings.setSetting('offerOverlayEnabled', val)}
                  showDivider
                />
              )}

              <TouchableOpacity
                onPress={() => {
                  void handleTestOfferAlert();
                }}
                disabled={isTestingAlert}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Probar sonido y vibración de oferta"
                className="flex-row items-center justify-center py-3.5 min-h-[48px]"
              >
                <Ionicons
                  name="play-circle-outline"
                  size={18}
                  color={THEME_COLORS.gold}
                  style={{ marginRight: 8 }}
                />
                <Text className="text-gold font-montserrat-semibold text-xs">
                  {isTestingAlert ? 'Probando alerta...' : 'Probar alerta ahora'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. NAVEGACIÓN Y CONDUCCIÓN */}
          <View className="mb-6">
            <Text className="text-ash font-montserrat-semibold text-[11px] uppercase tracking-widest mb-2.5 px-1">
              Navegación y conducción
            </Text>
            <View className="rounded-2xl bg-[#12131A] border border-white/10 overflow-hidden">
              <SettingToggleRow
                icon="navigate-outline"
                title="Indicaciones por voz"
                subtitle="Guía hablada giro a giro en Google Navigation"
                value={settings.navigationVoiceEnabled}
                onValueChange={(val) => settings.setSetting('navigationVoiceEnabled', val)}
                showDivider
              />

              <SettingToggleRow
                icon="bluetooth-outline"
                title="Audio por Bluetooth"
                subtitle="Enviar voz de navegación al estéreo del vehículo"
                value={settings.navigationBluetoothAudio}
                onValueChange={(val) => settings.setSetting('navigationBluetoothAudio', val)}
                showDivider
              />

              {Platform.OS === 'android' && (
                <SettingToggleRow
                  icon="ellipse-outline"
                  title="Esfera flotante al minimizar"
                  subtitle="Acceso rápido con el logo mientras estás en línea"
                  value={settings.floatingBubbleEnabled}
                  onValueChange={(val) => {
                    settings.setSetting('floatingBubbleEnabled', val);
                    if (!val) {
                      void driverOverlay.hideFloatingBubble();
                    }
                  }}
                  showDivider
                />
              )}

              <SettingToggleRow
                icon="hand-left-outline"
                title="Respuesta táctil"
                subtitle="Vibración suave al tocar controles principales"
                value={settings.hapticFeedbackEnabled}
                onValueChange={(val) => settings.setSetting('hapticFeedbackEnabled', val)}
              />
            </View>
          </View>

          {/* 3. SEGURIDAD Y RETAGUARDIA */}
          <View className="mb-6">
            <Text className="text-ash font-montserrat-semibold text-[11px] uppercase tracking-widest mb-2.5 px-1">
              Seguridad y compañeros
            </Text>
            <View className="rounded-2xl bg-[#12131A] border border-white/10 overflow-hidden">
              <SettingToggleRow
                icon="shield-half-outline"
                title="Alertas de respaldo cercanas"
                subtitle="Recibir pedidos de retaguardia de otros conductores"
                value={settings.peerSafetyAlertsEnabled}
                onValueChange={(val) => settings.setSetting('peerSafetyAlertsEnabled', val)}
                showDivider
              />

              <View className="px-4 py-3.5">
                <Text className="text-white/80 font-montserrat-medium text-xs mb-2.5">
                  Radio de tu aviso silencioso (cara feliz)
                </Text>
                <View className="flex-row gap-2">
                  {RADIUS_OPTIONS.map((option) => {
                    const selected = settings.peerSafetyRadiusKm === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          settings.setSetting('peerSafetyRadiusKm', option.value);
                        }}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={`flex-1 h-10 rounded-xl items-center justify-center border ${
                          selected
                            ? 'bg-gold/15 border-gold/60'
                            : 'bg-white/[0.04] border-white/10'
                        }`}
                      >
                        <Text
                          className={`font-montserrat-semibold text-xs ${
                            selected ? 'text-gold' : 'text-white/65'
                          }`}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* 4. PERMISOS Y SISTEMA */}
          <View className="mb-8">
            <Text className="text-ash font-montserrat-semibold text-[11px] uppercase tracking-widest mb-2.5 px-1">
              Permisos y sistema
            </Text>
            <View className="rounded-2xl bg-[#12131A] border border-white/10 overflow-hidden">
              <PermissionStatusRow
                icon="notifications-outline"
                title="Notificaciones push"
                statusLabel={
                  isPushRegistered
                    ? 'Activas y vinculadas'
                    : isExpoGoOnAndroid
                    ? 'Requiere Development Build'
                    : 'Pendientes de activación'
                }
                isGranted={isPushRegistered}
                actionLabel={isPushRegistered ? 'Ajustes' : 'Activar'}
                onPress={() => {
                  if (!isPushRegistered && !isExpoGoOnAndroid) {
                    void syncDeviceToken(undefined, true);
                  } else {
                    void Linking.openSettings();
                  }
                }}
                showDivider
              />

              <PermissionStatusRow
                icon="location-outline"
                title="Ubicación en segundo plano"
                statusLabel={
                  bgLocationGranted ? 'Permitida todo el tiempo' : 'Pendiente de configurar'
                }
                isGranted={bgLocationGranted}
                actionLabel={bgLocationGranted ? 'Ajustes' : 'Configurar'}
                onPress={() => {
                  if (bgLocationGranted) {
                    void Linking.openSettings();
                  } else {
                    void requestBackgroundLocationPermission().then(() =>
                      refreshSystemPermissions()
                    );
                  }
                }}
                showDivider={Platform.OS === 'android'}
              />

              {Platform.OS === 'android' && (
                <PermissionStatusRow
                  icon="browsers-outline"
                  title="Mostrar sobre otras apps"
                  statusLabel={
                    overlayGranted
                      ? 'Habilitado para esfera y ofertas'
                      : 'Sin permiso asignado'
                  }
                  isGranted={overlayGranted}
                  actionLabel={overlayGranted ? 'Revisar' : 'Habilitar'}
                  onPress={() => {
                    void driverOverlay.requestOverlayPermission();
                  }}
                />
              )}
            </View>
          </View>

          {/* Pie: Restablecer + Versión */}
          <TouchableOpacity
            onPress={handleResetDefaults}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Restablecer configuración predeterminada"
            className="w-full py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 items-center justify-center mb-4"
          >
            <Text className="text-white/75 font-montserrat-semibold text-xs">
              Restablecer valores predeterminados
            </Text>
          </TouchableOpacity>

          <Text className="text-zinc-500 font-montserrat text-[11px] text-center">
            Transfer Black Conductor · v{appVersion}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
