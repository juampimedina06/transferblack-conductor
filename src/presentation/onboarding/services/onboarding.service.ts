import { transferApi } from '@/core/api/transferApi';
import { ProfileFormData, VehicleFormData } from '../schemas/onboarding.schema';
import { DocumentState, DocumentType } from '../store/useOnboardingStore';

// DTOs para el backend
interface UpdateProfileDto {
  first_name: string;
  last_name: string;
  phone_number: string;
  birth_date: string;
  gender: string;
  document_type: string;
  document_number: string;
  address_text: string;
}

interface UploadResponse {
  filePath: string;
  mimeType: string;
  sizeBytes: number;
}

interface SubmitApplicationDto {
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    seatCount: number;
    vehicleType: string;
    chassisNumber: string;
    engineNumber: string;
  };
  driverDocuments: Array<{
    documentType: string;
    filePath: string;
    documentNumber?: string;
    issuedAt?: string;
    expiresAt?: string;
  }>;
  vehicleDocuments: Array<{
    documentType: string;
    filePath: string;
    documentNumber?: string;
    issuedAt?: string;
    expiresAt?: string;
  }>;
}

export const OnboardingService = {
  updateProfile: async (data: ProfileFormData) => {
    const payload: UpdateProfileDto = {
      first_name: data.first_name,
      last_name: data.last_name,
      phone_number: data.phone_number,
      birth_date: data.birth_date,
      gender: data.gender,
      document_type: data.document_type,
      document_number: data.document_number,
      address_text: data.address_text,
    };
    const response = await transferApi.patch('/users/me', payload);
    return response.data;
  },

  uploadDocument: async (
    fileUri: string,
    mimeType: string,
    documentType?: DocumentType,
    issuedAt?: string | null,
    expiresAt?: string | null
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    
    // Extraer el nombre del archivo de la URI
    const filename = fileUri.split('/').pop() || 'upload.jpg';
    
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);

    if (documentType) {
      formData.append('documentType', documentType);
    }
    if (issuedAt) {
      formData.append('issuedAt', issuedAt);
    }
    if (expiresAt) {
      formData.append('expiresAt', expiresAt);
    }

    const response = await transferApi.post<UploadResponse>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  getDraftDocuments: async (): Promise<Array<{
    documentType: DocumentType;
    filePath: string;
    mimeType: string;
    metadata?: {
      issuedAt?: string | null;
      expiresAt?: string | null;
    };
    uploadedAt: string;
  }>> => {
    const response = await transferApi.get<{
      status: string;
      data: Array<{
        documentType: DocumentType;
        filePath: string;
        mimeType: string;
        metadata?: {
          issuedAt?: string | null;
          expiresAt?: string | null;
        };
        uploadedAt: string;
      }>;
    }>('/driver/documents/draft');

    return response.data.data;
  },

  deleteDraftDocument: async (documentType: DocumentType): Promise<void> => {
    await transferApi.delete(`/driver/documents/draft/${documentType}`);
  },

  submitApplication: async (vehicleData: VehicleFormData, documents: Record<DocumentType, DocumentState>) => {
    // Filtrar documentos del conductor vs vehículo según el enum/tipo esperado en backend
    const driverDocTypes = ['dni', 'license_d1', 'insurance_policy', 'criminal_record_national', 'criminal_record_provincial', 'sex_offenses_registry'];
    const vehicleDocTypes = ['vehicle_title', 'itv'];

    const driverDocuments = [];
    const vehicleDocuments = [];

    for (const [type, state] of Object.entries(documents)) {
      if (!state.filePath) continue; // No debería pasar si validamos antes
      
      const docPayload = {
        documentType: type,
        filePath: state.filePath,
        documentNumber: state.metadata?.documentNumber || undefined,
        issuedAt: state.metadata?.issuedAt || undefined,
        expiresAt: state.metadata?.expiresAt || undefined,
      };

      if (driverDocTypes.includes(type)) {
        driverDocuments.push(docPayload);
      } else if (vehicleDocTypes.includes(type)) {
        vehicleDocuments.push(docPayload);
      }
    }

    const payload: SubmitApplicationDto = {
      vehicle: {
        plate: vehicleData.plate,
        brand: vehicleData.brand,
        model: vehicleData.model,
        year: vehicleData.year,
        color: vehicleData.color,
        seatCount: vehicleData.seatCount,
        vehicleType: vehicleData.vehicleType,
        chassisNumber: vehicleData.chassisNumber,
        engineNumber: vehicleData.engineNumber,
      },
      driverDocuments,
      vehicleDocuments,
    };

    const response = await transferApi.post('/driver/application', payload);
    return response.data;
  }
};
