export type CancellationReasonCode =
  | 'PASSENGER_NO_SHOW'
  | 'SAFETY_ISSUE'
  | 'PASSENGER_REQUEST'
  | 'VEHICLE_EMERGENCY'
  | 'NO_REASON'
  | 'OTHER';

export interface CancellationReasonOption {
  code: CancellationReasonCode;
  label: string;
  isJustified: boolean;
}

export const CANCELLATION_REASONS: CancellationReasonOption[] = [
  { code: 'PASSENGER_NO_SHOW', label: 'Pasajero no se presentó', isJustified: true },
  { code: 'SAFETY_ISSUE', label: 'Problema de seguridad en la zona', isJustified: true },
  { code: 'PASSENGER_REQUEST', label: 'El pasajero pidió cancelar', isJustified: true },
  { code: 'VEHICLE_EMERGENCY', label: 'Problema mecánico o emergencia del vehículo', isJustified: true },
  { code: 'NO_REASON', label: 'No puedo realizar el viaje (sin justificar)', isJustified: false },
  { code: 'OTHER', label: 'Otro motivo no justificado', isJustified: false },
];

export interface CancellationResult {
  counted: boolean;
  consecutiveCancellations: number;
  remainingBeforeSuspension: number;
  warning?: {
    code: string;
    message: string;
  };
  suspension?: {
    code: string;
    dispatchSuspendedUntil: string;
  };
}

export type DriverComplianceStatus = 'compliant' | 'expiring_soon' | 'suspended_documents';

export interface DriverCompliance {
  status: DriverComplianceStatus;
  nextExpiryAt?: string | null;
  daysUntilNextExpiry?: number | null;
  blockingDocuments?: string[];
}

export interface DriverMeStatus {
  consecutiveCancellations: number;
  dispatchSuspendedUntil: string | null;
  compliance: DriverCompliance;
}

export type DriverDocumentStatus =
  | 'valid'
  | 'expiring_soon'
  | 'expired'
  | 'pending_review'
  | 'rejected';

export interface DriverDocumentItem {
  id: string;
  type?: string;
  documentType: string;
  status: DriverDocumentStatus;
  expiresAt: string | null;
  daysRemaining?: number | null;
  daysUntilExpiry?: number | null;
  rejectionReason?: string | null;
}
