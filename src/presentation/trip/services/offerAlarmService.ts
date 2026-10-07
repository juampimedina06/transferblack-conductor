import type { Audio as AudioNamespace } from 'expo-av';
import { NativeModules, Vibration } from 'react-native';

let cachedAudio: typeof AudioNamespace | null | undefined;

const checkHasNativeAV = (): boolean => {
  if (process.env.NODE_ENV === 'test') return true;

  try {
    const expoModules = (globalThis as any)?.expo?.modules;
    if (expoModules && 'ExponentAV' in expoModules) {
      return Boolean(expoModules.ExponentAV);
    }
    if ((NativeModules as any)?.ExponentAV) {
      return true;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core');
    return Boolean(requireOptionalNativeModule?.('ExponentAV'));
  } catch {
    return false;
  }
};

const getAudio = async (): Promise<typeof AudioNamespace | null> => {
  if (cachedAudio !== undefined) return cachedAudio;

  if (!checkHasNativeAV()) {
    cachedAudio = null;
    return null;
  }

  try {
    const expoAv = await import('expo-av');
    cachedAudio = expoAv?.Audio ?? (expoAv as any)?.default?.Audio ?? null;
  } catch {
    cachedAudio = null;
  }
  return cachedAudio;
};

class OfferAlarmService {
  private sound: AudioNamespace.Sound | null = null;
  private isPlaying = false;
  private isVibrating = false;
  /**
   * Inicia el sonido chill de alerta para la oferta entrante sin vibración molesta.
   */
  async start(options: { vibrate?: boolean } = {}): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      // Vibración opcional (deshabilitada por defecto para no molestar al conductor)
      if (options.vibrate) {
        Vibration.vibrate([0, 500, 500, 500], true);
        this.isVibrating = true;
      } else {
        this.isVibrating = false;
      }

      // Configurar modo de audio de alta prioridad si el módulo nativo está disponible
      const Audio = await getAudio();
      if (Audio) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Si ya existía una instancia de sonido previa, descargarla
        if (this.sound) {
          await this.sound.unloadAsync().catch(() => {});
          this.sound = null;
        }

        // Cargar sonido chill de campana/notificación agradable
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3' },
            {
              isLooping: false,
              volume: 0.75,
              shouldPlay: true,
            }
          );
          this.sound = sound;
        } catch {
          // Si falla la carga del audio remoto, no bloquea el flujo
        }
      }
    } catch (error) {
      console.warn('⚠️ [OfferAlarmService] No se pudo iniciar audio chill:', error);
    }
  }

  /**
   * Detiene inmediatamente la alarma sonora y la vibración.
   */
  async stop(): Promise<void> {
    this.isPlaying = false;

    if (this.isVibrating) {
      Vibration.cancel();
      this.isVibrating = false;
    }

    if (this.sound) {
      try {
        await this.sound.stopAsync().catch(() => {});
        await this.sound.unloadAsync().catch(() => {});
      } catch {
        // Ignore unload errors
      } finally {
        this.sound = null;
      }
    }
  }

  getStatus(): { isPlaying: boolean; isVibrating: boolean } {
    return { isPlaying: this.isPlaying, isVibrating: this.isVibrating };
  }
}

export const offerAlarmService = new OfferAlarmService();
