import { Platform, Vibration } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';
import {
  type VibrationIntensity,
  useDriverSettingsStore,
} from '@/presentation/settings/store/useDriverSettingsStore';

const isExpoGoOnAndroid =
  Platform.OS === 'android' && Constants.appOwnership === AppOwnership.Expo;

const VIBRATION_PATTERNS: Record<VibrationIntensity, number[]> = {
  subtle: [0, 200, 600, 200],
  normal: [0, 450, 450, 450],
  strong: [0, 650, 220, 650, 220, 650],
};

class OfferAlarmService {
  private isPlaying = false;
  private isVibrating = false;

  /**
   * Inicia la alerta para la oferta entrante respetando las preferencias del conductor.
   */
  async start(options: { vibrate?: boolean; intensity?: VibrationIntensity } = {}): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const settings = useDriverSettingsStore.getState();
    const shouldVibrate = options.vibrate ?? settings.offerVibrationEnabled;
    const intensity = options.intensity ?? settings.offerVibrationIntensity;

    if (shouldVibrate) {
      Vibration.vibrate(VIBRATION_PATTERNS[intensity], true);
      this.isVibrating = true;
    } else {
      this.isVibrating = false;
    }
  }

  /**
   * Detiene inmediatamente la alerta y la vibración.
   */
  async stop(): Promise<void> {
    this.isPlaying = false;

    if (this.isVibrating) {
      Vibration.cancel();
      this.isVibrating = false;
    }
  }

  /**
   * Prueba corta (1.4s) desde la pantalla de Configuración para verificar vibración y sonido.
   */
  async testAlert(options: {
    vibrate: boolean;
    intensity: VibrationIntensity;
    sound: boolean;
  }): Promise<void> {
    if (options.vibrate) {
      Vibration.vibrate(VIBRATION_PATTERNS[options.intensity], false);
      setTimeout(() => {
        if (!this.isPlaying) {
          Vibration.cancel();
        }
      }, 1400);
    }

    if (options.sound && !isExpoGoOnAndroid) {
      try {
        const Notifications = await import('expo-notifications');
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Prueba de alerta Transfer Black',
            body: 'Así sonará cuando entre una nueva oferta de viaje.',
            sound: true,
          },
          trigger: Platform.OS === 'android' ? { channelId: 'trip-offers' } : null,
        });
      } catch {
        // Ignorar si notificaciones locales no están disponibles en el entorno
      }
    }
  }

  getStatus(): { isPlaying: boolean; isVibrating: boolean } {
    return { isPlaying: this.isPlaying, isVibrating: this.isVibrating };
  }
}

export const offerAlarmService = new OfferAlarmService();
