import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OnboardingService } from '../services/onboarding.service';
import { ProfileFormData, VehicleFormData } from '../schemas/onboarding.schema';
import { DocumentState, DocumentType, useOnboardingStore } from '../store/useOnboardingStore';

export const useDraftDocuments = () => {
  const setDocumentState = useOnboardingStore((state) => state.setDocumentState);

  return useQuery({
    queryKey: ['driver-draft-documents'],
    queryFn: async () => {
      try {
        const drafts = await OnboardingService.getDraftDocuments();
        if (Array.isArray(drafts)) {
          drafts.forEach((draft) => {
            const currentDoc = useOnboardingStore.getState().documents[draft.documentType];
            setDocumentState(draft.documentType, {
              filePath: draft.filePath,
              mimeType: draft.mimeType,
              uploadStatus: 'uploaded',
              metadata: {
                documentNumber: currentDoc?.metadata?.documentNumber || null,
                issuedAt: draft.metadata?.issuedAt || currentDoc?.metadata?.issuedAt || null,
                expiresAt: draft.metadata?.expiresAt || currentDoc?.metadata?.expiresAt || null,
              },
            });
          });
        }
        return drafts;
      } catch (e) {
        console.error('Error fetching draft documents:', e);
        return [];
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
};

export const useOnboardingMutations = () => {
  const queryClient = useQueryClient();
  const setDocumentState = useOnboardingStore((state) => state.setDocumentState);

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => OnboardingService.updateProfile(data),
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: ({
      fileUri,
      mimeType,
      type,
      issuedAt,
      expiresAt,
    }: {
      fileUri: string;
      mimeType: string;
      type: DocumentType;
      issuedAt?: string | null;
      expiresAt?: string | null;
    }) => {
      setDocumentState(type, { uploadStatus: 'uploading' });
      return OnboardingService.uploadDocument(fileUri, mimeType, type, issuedAt, expiresAt);
    },
    onSuccess: (data, variables) => {
      setDocumentState(variables.type, {
        filePath: data.filePath,
        mimeType: variables.mimeType,
        uploadStatus: 'uploaded',
      });
      queryClient.invalidateQueries({ queryKey: ['driver-draft-documents'] });
    },
    onError: (error, variables) => {
      setDocumentState(variables.type, { uploadStatus: 'error' });
      console.error(`Error uploading document ${variables.type}:`, error);
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (type: DocumentType) => OnboardingService.deleteDraftDocument(type),
    onSuccess: (_, type) => {
      setDocumentState(type, {
        localUri: null,
        filePath: null,
        uploadStatus: 'pending',
        metadata: null,
      });
      queryClient.invalidateQueries({ queryKey: ['driver-draft-documents'] });
    },
    onError: (error, type) => {
      console.error(`Error deleting draft document ${type}:`, error);
    },
  });

  const submitApplicationMutation = useMutation({
    mutationFn: ({
      vehicleData,
      documents,
    }: {
      vehicleData: VehicleFormData;
      documents: Record<DocumentType, DocumentState>;
    }) => OnboardingService.submitApplication(vehicleData, documents),
  });

  return {
    updateProfile: updateProfileMutation,
    uploadDocument: uploadDocumentMutation,
    deleteDocument: deleteDocumentMutation,
    submitApplication: submitApplicationMutation,
  };
};
