import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_LEGAL_TERMS_VERSION } from '../../../core/legal/constants/legalTerms.constants';

interface LegalState {
  acceptedTermsVersion: string | null;
  acceptedAt: string | null;
  hasAcceptedCurrentTerms: () => boolean;
  acceptTerms: (version?: string) => void;
  resetTermsAcceptance: () => void;
}

export const useLegalStore = create<LegalState>()(
  persist(
    (set, get) => ({
      acceptedTermsVersion: null,
      acceptedAt: null,

      hasAcceptedCurrentTerms: () => {
        return get().acceptedTermsVersion === CURRENT_LEGAL_TERMS_VERSION;
      },

      acceptTerms: (version?: string) => {
        const targetVersion = version || CURRENT_LEGAL_TERMS_VERSION;
        set({
          acceptedTermsVersion: targetVersion,
          acceptedAt: new Date().toISOString(),
        });
      },

      resetTermsAcceptance: () => {
        set({
          acceptedTermsVersion: null,
          acceptedAt: null,
        });
      },
    }),
    {
      name: 'driver-legal-terms-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        acceptedTermsVersion: state.acceptedTermsVersion,
        acceptedAt: state.acceptedAt,
      }),
    },
  ),
);
