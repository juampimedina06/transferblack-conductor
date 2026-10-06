import { Audio } from 'expo-av';
import { Vibration } from 'react-native';

class OfferAlarmService {
  private sound: Audio.Sound | null = null;
  private isPlaying = false;
  private isVibrating = false;

  /**
   * Inicia el sonido de alarma y vibración continua para alertar de la oferta entrante.
   */
  async start(): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    try {
      // Iniciar vibración en loop (patrón 500ms vibra, 500ms pausa)
      Vibration.vibrate([0, 500, 500, 500], true);
      this.isVibrating = true;

      // Configurar modo de audio de alta prioridad
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

      // Cargar sonido de alerta si está disponible
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
          {
            isLooping: true,
            volume: 1.0,
            shouldPlay: true,
          }
        );
        this.sound = sound;
      } catch {
        // En caso de que no haya conexión para el audio remoto o falle la carga nativa,
        // la vibración continua ya está activa como fallback infalible.
      }
    } catch (error) {
      console.warn('⚠️ [OfferAlarmService] No se pudo iniciar audio continuo:', error);
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
