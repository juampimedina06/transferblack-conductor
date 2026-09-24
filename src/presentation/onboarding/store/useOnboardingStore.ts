import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileFormData, VehicleFormData, DocumentMetadataFormData } from '../schemas/onboarding.schema';

export type DocumentType =
  | 'dni'
  | 'license_d1'
  | 'insurance_policy'
  | 'criminal_record_national'
  | 'criminal_record_provincial'
  | 'sex_offenses_registry'
  | 'vehicle_title'
  | 'itv';

export interface DocumentState {
  documentType: DocumentType;
  localUri: string | null;
  filePath: string | null; // returned by backend
  mimeType?: string | null;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  metadata: DocumentMetadataFormData | null;
}

export const createInitialDocuments = (): Record<DocumentType, DocumentState> => ({
  dni: { documentType: 'dni', localUri: null, filePath: null, mimeType: null, uploadStatus: 'pending', metadata: null },
  license_d1: { documentType: 'license_d1', localUri: null, filePath: null, mimeType: null, uploadStatus: 'pending', metadata: null },
  insurance_policy: { documentType: 'insurance_policy', localUri: null, filePath: null, mimeType: null, uploadStatus: 'pending', metadata: null },
  criminal_record_national: { documentType: 'criminal_record_national', localUri: null, filePath: null, mimeType: null, uploadStatus: 'pending', metadata: null },
  criminal_record_provincial: { documentType: 'criminal_record_provincial', localUri: null, filePath: null, mimeType: null, uploadStatus: 'pending', metadata: null },
  sex_offenses_registry: { documentType: 'sex_offenses_registry', localUri: null, filePath: null, mimeType: null, uploadStatus: 'pending', metadata: null },
  vehicle_title: { documentType: 'vehicle_title', localUri: null, filePath: null, mimeType: null, uploadStatus: 'pending', metadata: null },
  itv: { documentType: 'itv', localUri: null, filePath: null, mimeType: null, uploadStatus: 'pending', metadata: null },
});

interface OnboardingDraftData {
  currentStep: number;
  profileData: ProfileFormData | null;
  vehicleData: VehicleFormData | null;
  documents: Record<DocumentType, DocumentState>;
}

interface OnboardingState extends OnboardingDraftData {
  activeUserId: string | null;
  isHydrated: boolean;

  // Actions
  initUserSession: (userId: string) => Promise<void>;
  setCurrentStep: (step: number) => void;
  setProfileData: (data: ProfileFormData) => void;
  setVehicleData: (data: VehicleFormData) => void;
  setDocumentState: (type: DocumentType, state: Partial<DocumentState>) => void;
  resetOnboarding: () => Promise<void>;
}

const getStorageKey = (userId?: string | null) =>
  userId ? `@transferblack:onboarding:${userId}` : '@transferblack:onboarding:anonymous';

export const useOnboardingStore = create<OnboardingState>((set, get) => {
  const saveToStorage = async (stateToSave: Partial<OnboardingDraftData>) => {
    try {
      const { activeUserId, currentStep, profileData, vehicleData, documents } = get();
      const payload: OnboardingDraftData = {
        currentStep: stateToSave.currentStep ?? currentStep,
        profileData: stateToSave.profileData !== undefined ? stateToSave.profileData : profileData,
        vehicleData: stateToSave.vehicleData !== undefined ? stateToSave.vehicleData : vehicleData,
        documents: stateToSave.documents ?? documents,
      };
      const key = getStorageKey(activeUserId);
      await AsyncStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.error('Error saving onboarding draft:', e);
    }
  };

  return {
    activeUserId: null,
    isHydrated: false,
    currentStep: 1,
    profileData: null,
    vehicleData: null,
    documents: createInitialDocuments(),

    initUserSession: async (userId: string) => {
      try {
        const key = getStorageKey(userId);
        const stored = await AsyncStorage.getItem(key);

        if (stored) {
          const parsed: OnboardingDraftData = JSON.parse(stored);
          set({
            activeUserId: userId,
            isHydrated: true,
            currentStep: parsed.currentStep || 1,
            profileData: parsed.profileData || null,
            vehicleData: parsed.vehicleData || null,
            documents: {
              ...createInitialDocuments(),
              ...(parsed.documents || {}),
            },
          });
        } else {
          set({
            activeUserId: userId,
            isHydrated: true,
            currentStep: 1,
            profileData: null,
            vehicleData: null,
            documents: createInitialDocuments(),
          });
        }
      } catch (e) {
        console.error('Error hydrating onboarding draft:', e);
        set({ activeUserId: userId, isHydrated: true });
      }
    },

    setCurrentStep: (step) => {
      set({ currentStep: step });
      saveToStorage({ currentStep: step });
    },

    setProfileData: (data) => {
      set({ profileData: data });
      saveToStorage({ profileData: data });
    },

    setVehicleData: (data) => {
      set({ vehicleData: data });
      saveToStorage({ vehicleData: data });
    },

    setDocumentState: (type, docState) => {
      const currentDocs = get().documents;
      const updatedDocs = {
        ...currentDocs,
        [type]: {
          ...currentDocs[type],
          ...docState,
        },
      };
      set({ documents: updatedDocs });
      saveToStorage({ documents: updatedDocs });
    },

    resetOnboarding: async () => {
      const { activeUserId } = get();
      if (activeUserId) {
        try {
          await AsyncStorage.removeItem(getStorageKey(activeUserId));
        } catch (e) {
          console.error('Error clearing onboarding storage:', e);
        }
      }
      set({
        currentStep: 1,
        profileData: null,
        vehicleData: null,
        documents: createInitialDocuments(),
      });
    },
  };
});
