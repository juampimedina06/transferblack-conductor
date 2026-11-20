import type { Ionicons } from '@expo/vector-icons';
import type { DocumentType } from '../store/useOnboardingStore';

export interface DocumentCatalogEntry {
  type: DocumentType;
  label: string;
  shortHint: string;
  icon: keyof typeof Ionicons.glyphMap;
  requiresDocumentNumber: boolean;
  docNumberLabel: string;
  docNumberPlaceholder: string;
  acceptsPdfRecommended: boolean;
}

export const DOCUMENT_CATALOG: Record<DocumentType, DocumentCatalogEntry> = {
  dni: {
    type: 'dni',
    label: 'DNI (Frente y Dorso)',
    shortHint: 'Foto nítida con número y vencimiento legibles',
    icon: 'card-outline',
    requiresDocumentNumber: false,
    docNumberLabel: 'N° de trámite / DNI (opcional)',
    docNumberPlaceholder: 'Ej: 35123456',
    acceptsPdfRecommended: false,
  },
  license_d1: {
    type: 'license_d1',
    label: 'Licencia de Conducir (D1)',
    shortHint: 'Categoría profesional D1 vigente',
    icon: 'id-card-outline',
    requiresDocumentNumber: false,
    docNumberLabel: 'N° de licencia (opcional)',
    docNumberPlaceholder: 'Ej: 35123456',
    acceptsPdfRecommended: false,
  },
  insurance_policy: {
    type: 'insurance_policy',
    label: 'Póliza de Seguro al Día',
    shortHint: 'Cobertura vigente con patente visible (foto o PDF)',
    icon: 'shield-checkmark-outline',
    requiresDocumentNumber: false,
    docNumberLabel: 'N° de póliza (opcional)',
    docNumberPlaceholder: 'Ej: 0004-12345678',
    acceptsPdfRecommended: true,
  },
  criminal_record_national: {
    type: 'criminal_record_national',
    label: 'Antecedentes Penales Nacionales',
    shortHint: 'Certificado RNR vigente (menor a 60 días)',
    icon: 'document-text-outline',
    requiresDocumentNumber: false,
    docNumberLabel: 'N° de trámite / código (opcional)',
    docNumberPlaceholder: 'Ej: RNR-2026-0001',
    acceptsPdfRecommended: true,
  },
  criminal_record_provincial: {
    type: 'criminal_record_provincial',
    label: 'Antecedentes Penales Provinciales',
    shortHint: 'Certificado policial de buena conducta vigente',
    icon: 'document-attach-outline',
    requiresDocumentNumber: false,
    docNumberLabel: 'N° de certificado (opcional)',
    docNumberPlaceholder: 'Ej: 12345/2026',
    acceptsPdfRecommended: true,
  },
  sex_offenses_registry: {
    type: 'sex_offenses_registry',
    label: 'Registro de Ofensores Sexuales',
    shortHint: 'Constancia provincial de no inscripción',
    icon: 'ribbon-outline',
    requiresDocumentNumber: false,
    docNumberLabel: 'N° de constancia (opcional)',
    docNumberPlaceholder: 'Ej: 00012345',
    acceptsPdfRecommended: true,
  },
  vehicle_title: {
    type: 'vehicle_title',
    label: 'Título de Propiedad Automotor',
    shortHint: 'Título digital (CAT) con patente y chasis',
    icon: 'car-sport-outline',
    requiresDocumentNumber: true,
    docNumberLabel: 'N° de trámite / título',
    docNumberPlaceholder: 'Ej: 00123456',
    acceptsPdfRecommended: true,
  },
  itv: {
    type: 'itv',
    label: 'ITV / RTO (Revisión Técnica)',
    shortHint: 'Certificado APTO con fecha de vencimiento',
    icon: 'construct-outline',
    requiresDocumentNumber: true,
    docNumberLabel: 'N° de certificado / oblea',
    docNumberPlaceholder: 'Ej: ITV-987654',
    acceptsPdfRecommended: false,
  },
};

export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

export function resolveDocumentPreviewUri(
  localUri?: string | null,
  filePath?: string | null
): string | null {
  if (localUri) return localUri;
  if (!filePath) return null;
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('file://')
  ) {
    return filePath;
  }
  const apiBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') || '';
  return `${apiBase}/${filePath.replace(/^\//, '')}`;
}
