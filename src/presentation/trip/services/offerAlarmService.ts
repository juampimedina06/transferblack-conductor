import { Vibration } from 'react-native';

class OfferAlarmService {
  private isPlaying = false;
  private isVibrating = false;
  /**
   * Inicia la alerta para la oferta entrante. La vibración es opcional.
   */
  async start(options: { vibrate?: boolean } = {}): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Vibración opcional (deshabilitada por defecto para no molestar al conductor)
    if (options.vibrate) {
      Vibration.vibrate([0, 500, 500, 500], true);
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

  getStatus(): { isPlaying: boolean; isVibrating: boolean } {
    return { isPlaying: this.isPlaying, isVibrating: this.isVibrating };
  }
}

export const offerAlarmService = new OfferAlarmService();
