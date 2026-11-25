import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type VibrationIntensity = 'subtle' | 'normal' | 'strong';
export type OfferSoundTone =
  | 'black_pulse'
  | 'executive_sonar'
  | 'gold_chord'
  | 'turbo_dispatch'
  | 'transfer_voice'
  | 'transfer_black_male';
export type PeerAlertRadiusKm = 3 | 5 | 10;

const LEGACY_TONE_MAP: Record<string, OfferSoundTone> = {
  ringtone: 'executive_sonar',
  default: 'executive_sonar',
  chime: 'gold_chord',
  alarm: 'turbo_dispatch',
};

const VALID_OFFER_TONES = new Set<OfferSoundTone>([
  'black_pulse',
  'executive_sonar',
  'gold_chord',
  'turbo_dispatch',
  'transfer_voice',
  'transfer_black_male',
]);

export function normalizeOfferSoundTone(value: unknown): OfferSoundTone {
  if (typeof value === 'string') {
    if (VALID_OFFER_TONES.has(value as OfferSoundTone)) {
      return value as OfferSoundTone;
    }
    if (value in LEGACY_TONE_MAP) {
      return LEGACY_TONE_MAP[value];
    }
  }
  return 'executive_sonar';
}

export interface DriverSettingsValues {
  // Alertas de ofertas de viaje
  offerSoundEnabled: boolean;
  offerSoundTone: OfferSoundTone;
  offerVibrationEnabled: boolean;
  offerVibrationIntensity: VibrationIntensity;
  offerOverlayEnabled: boolean;

  // Navegación y conducción
  navigationVoiceEnabled: boolean;
  navigationBluetoothAudio: boolean;
  floatingBubbleEnabled: boolean;
  hapticFeedbackEnabled: boolean;

  // Seguridad y respaldo entre conductores
  peerSafetyAlertsEnabled: boolean;
  peerSafetyRadiusKm: PeerAlertRadiusKm;
}

export interface DriverSettingsState extends DriverSettingsValues {
  setSetting: <K extends keyof DriverSettingsValues>(
    key: K,
    value: DriverSettingsValues[K]
  ) => void;
  resetToDefaults: () => void;
}

export const DEFAULT_DRIVER_SETTINGS: DriverSettingsValues = {
  offerSoundEnabled: true,
  offerSoundTone: 'executive_sonar',
  offerVibrationEnabled: true,
  offerVibrationIntensity: 'normal',
  offerOverlayEnabled: true,

  navigationVoiceEnabled: true,
  navigationBluetoothAudio: true,
  floatingBubbleEnabled: true,
  hapticFeedbackEnabled: true,

  peerSafetyAlertsEnabled: true,
  peerSafetyRadiusKm: 5,
};

export const useDriverSettingsStore = create<DriverSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_DRIVER_SETTINGS,

      setSetting: (key, value) =>
        set((state) => ({
          ...state,
          [key]: value,
        })),

      resetToDefaults: () => set({ ...DEFAULT_DRIVER_SETTINGS }),
    }),
    {
      name: '@transferblack/driver-settings',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<DriverSettingsValues>;
        return {
          ...currentState,
          ...persisted,
          offerSoundTone: normalizeOfferSoundTone(persisted.offerSoundTone),
        };
      },
    }
  )
);
