import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type VibrationIntensity = 'subtle' | 'normal' | 'strong';
export type OfferSoundTone = 'ringtone' | 'alarm' | 'default' | 'chime';
export type PeerAlertRadiusKm = 3 | 5 | 10;

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
  offerSoundTone: 'ringtone',
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
    }
  )
);
