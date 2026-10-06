import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDriverStatusStore } from '../../driver/store/useDriverStatusStore';
import { DriverDocumentItem } from '@/core/driver/interface/driverStatus.interface';
import { DocumentScannerModal } from '../ui/DocumentScannerModal';
import { DocumentType } from '../../onboarding/store/useOnboardingStore';
import { OnboardingService } from '../../onboarding/services/onboarding.service';
import { transferApi } from '@/core/api/transferApi';
import { THEME_COLORS } from '@/core/constants/theme';

interface DriverDocumentsModalProps {
  visible: boolean;
  onClose: () => void;
  initialSelectedDocType?: string | null;
}

const DOCUMENT_LABELS: Record<string, string> = {
  dni: 'DNI (Frente y Dorso)',
  license_d1: 'Licencia Nacional de Conducir (D1)',
  driver_license: 'Licencia Nacional de Conducir',
  insurance_policy: 'Póliza de Seguro Automotor',
  criminal_record_national: 'Antecedentes Penales (Nacionales)',
  criminal_record_provincial: 'Antecedentes Penales (Provinciales)',
  sex_offenses_registry: 'Registro de Ofensores Sexuales',
  vehicle_title: 'Título de Propiedad Automotor',
  itv: 'Inspección Técnica Vehicular (ITV / RTO)',
};

export const DriverDocumentsModal: React.FC<DriverDocumentsModalProps> = ({
  visible,
  onClose,
  initialSelectedDocType,
}) => {
  const documents = useDriverStatusStore((state) => state.documents);
  const isLoading = useDriverStatusStore((state) => state.isLoading);
  const fetchDocuments = useDriverStatusStore((state) => state.fetchDocuments);
  const fetchStatus = useDriverStatusStore((state) => state.fetchStatus);

  const [selectedDoc, setSelectedDoc] = useState<DriverDocumentItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      void fetchDocuments();
    }
  }, [visible, fetchDocuments]);

  const handleStartRenewal = (doc: DriverDocumentItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDoc(doc);
    setIsScannerOpen(true);
  };

  const handlePhotoCaptured = async (uri: string, mimeType: string) => {
    if (!selectedDoc) return;
    setIsScannerOpen(false);
    setIsUploading(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Subir archivo al backend
      const uploadRes = await OnboardingService.uploadDocument(
        uri,
        mimeType,
        selectedDoc.documentType as DocumentType
      );

      // Actualizar documento para revisión
      try {
        await transferApi.patch(`/driver/documents/${selectedDoc.id}/retry`, {
          filePath: uploadRes.filePath,
        });
      } catch {
        // Fallback a POST /drivers/me/documents
        await transferApi.post('/driver/documents', {
          id: selectedDoc.id,
          documentType: selectedDoc.documentType,
          filePath: uploadRes.filePath,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Documento enviado',
        'El documento fue subido exitosamente y se encuentra en proceso de validación.'
      );

      await fetchDocuments();
      await fetchStatus();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error al subir', error?.message || 'No se pudo subir el archivo.');
    } finally {
      setIsUploading(false);
      setSelectedDoc(null);
    }
  };

  const renderStatusBadge = (status: DriverDocumentItem['status'], days?: number | null) => {
    switch (status) {
      case 'valid':
        return (
          <View className="flex-row items-center bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
            <Text className="text-emerald-400 font-montserrat-semibold text-[10px] ml-1">
              Vigente
            </Text>
          </View>
        );
      case 'expiring_soon':
        return (
          <View className="flex-row items-center bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full">
            <Ionicons name="alert-circle" size={12} color="#F59E0B" />
            <Text className="text-amber-400 font-montserrat-semibold text-[10px] ml-1">
              {days !== null && days !== undefined
                ? `Vence en ${days} día${days === 1 ? '' : 's'}`
                : 'Vence pronto'}
            </Text>
          </View>
        );
      case 'expired':
        return (
          <View className="flex-row items-center bg-red-500/15 border border-red-500/30 px-2.5 py-1 rounded-full">
            <Ionicons name="close-circle" size={12} color="#EF4444" />
            <Text className="text-red-400 font-montserrat-semibold text-[10px] ml-1">
              Vencido
            </Text>
          </View>
        );
      case 'pending_review':
        return (
          <View className="flex-row items-center bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 rounded-full">
            <Ionicons name="time" size={12} color="#60A5FA" />
            <Text className="text-blue-400 font-montserrat-semibold text-[10px] ml-1">
              En revisión
            </Text>
          </View>
        );
      case 'rejected':
        return (
          <View className="flex-row items-center bg-red-600/20 border border-red-600/40 px-2.5 py-1 rounded-full">
            <Ionicons name="warning" size={12} color="#F87171" />
            <Text className="text-red-300 font-montserrat-semibold text-[10px] ml-1">
              Rechazado
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View className="flex-1 bg-black/85 justify-end">
          <View className="w-full bg-[#12131A] rounded-t-[32px] p-6 max-h-[88%] border-t border-white/10 shadow-2xl">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-white/10 mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-gold/15 border border-gold/30 items-center justify-center mr-3">
                  <Ionicons name="document-text" size={20} color={THEME_COLORS.gold} />
                </View>
                <View>
                  <Text className="text-white font-montserrat-bold text-base">
                    Documentación Semestral
                  </Text>
                  <Text className="text-zinc-400 font-montserrat text-xs">
                    Estado de habilitación y vigencia
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={isUploading}
                className="w-9 h-9 rounded-full bg-white/5 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            {/* List */}
            {isLoading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator color={THEME_COLORS.gold} size="large" />
                <Text className="text-zinc-400 font-montserrat-medium text-xs mt-3">
                  Cargando estado de documentos...
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                {documents.length === 0 ? (
                  <View className="py-8 items-center justify-center px-4">
                    <Ionicons name="checkmark-done-circle" size={42} color="#10B981" />
                    <Text className="text-white font-montserrat-bold text-sm mt-3 text-center">
                      Todos tus documentos están al día
                    </Text>
                    <Text className="text-zinc-400 font-montserrat text-xs mt-1 text-center">
                      No tenés documentos pendientes ni vencidos en este período.
                    </Text>
                  </View>
                ) : (
                  documents.map((doc) => {
                    const label = DOCUMENT_LABELS[doc.documentType] || doc.documentType;
                    const canRenew =
                      doc.status === 'expiring_soon' ||
                      doc.status === 'expired' ||
                      doc.status === 'rejected';

                    return (
                      <View
                        key={doc.id}
                        className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 mb-3"
                      >
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-1 mr-2">
                            <Text className="text-white font-montserrat-semibold text-xs leading-4">
                              {label}
                            </Text>
                            {doc.expiresAt && (
                              <Text className="text-zinc-400 font-montserrat text-[11px] mt-1">
                                Vencimiento:{' '}
                                {new Date(doc.expiresAt).toLocaleDateString('es-AR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </Text>
                            )}
                          </View>
                          {renderStatusBadge(doc.status, doc.daysUntilExpiry)}
                        </View>

                        {doc.rejectionReason && (
                          <View className="bg-red-500/10 border border-red-500/25 rounded-xl p-2.5 my-2">
                            <Text className="text-red-400 font-montserrat text-[11px]">
                              Motivo: {doc.rejectionReason}
                            </Text>
                          </View>
                        )}

                        {canRenew && (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleStartRenewal(doc)}
                            disabled={isUploading}
                            className="mt-2 h-10 bg-gold/20 border border-gold/40 rounded-xl items-center justify-center flex-row"
                          >
                            <Ionicons name="camera" size={16} color={THEME_COLORS.gold} />
                            <Text className="text-gold font-montserrat-bold text-xs uppercase tracking-wider ml-2">
                              {doc.status === 'rejected' ? 'Reintentar documento' : 'Renovar ahora'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            {/* Upload indicator */}
            {isUploading && (
              <View className="py-2 flex-row items-center justify-center">
                <ActivityIndicator color={THEME_COLORS.gold} size="small" />
                <Text className="text-gold font-montserrat-medium text-xs ml-2">
                  Subiendo y procesando nuevo documento...
                </Text>
              </View>
            )}

            {/* Footer close */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              className="w-full h-12 bg-white/10 rounded-2xl items-center justify-center mt-2"
            >
              <Text className="text-white font-montserrat-semibold text-xs">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Escáner nativo de documentos */}
      {selectedDoc && (
        <DocumentScannerModal
          visible={isScannerOpen}
          docType={selectedDoc.documentType as DocumentType}
          stepIndex={1}
          totalSteps={1}
          onClose={() => {
            setIsScannerOpen(false);
            setSelectedDoc(null);
          }}
          onPhotoCaptured={handlePhotoCaptured}
        />
      )}
    </>
  );
};
