import React from 'react';
import { View, Text, ScrollView, Alert, Platform, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DocumentType, useOnboardingStore } from '../../presentation/onboarding/store/useOnboardingStore';
import { useOnboardingMutations, useDraftDocuments } from '../../presentation/onboarding/hooks/useOnboardingMutations';
import { DocumentItem } from '../../presentation/onboarding/components/DocumentItem';
import { documentMetadataSchema } from '../../presentation/onboarding/schemas/onboarding.schema';
import { Button } from '../../presentation/components/ui/Button';

const personalDocumentTypes: DocumentType[] = [
  'dni',
  'license_d1',
  'insurance_policy',
  'criminal_record_national',
  'criminal_record_provincial',
  'sex_offenses_registry',
];

const vehicleDocumentTypes: DocumentType[] = [
  'vehicle_title',
  'itv',
];

const documentLabels: Record<DocumentType, string> = {
  dni: 'DNI',
  license_d1: 'Licencia de Conducir',
  insurance_policy: 'Póliza de Seguro',
  criminal_record_national: 'Antecedentes Nacionales',
  criminal_record_provincial: 'Antecedentes Provinciales',
  sex_offenses_registry: 'Registro Ofensores Sexuales',
  vehicle_title: 'Título del Vehículo',
  itv: 'ITV / RTO',
};

export default function DocumentsScreen() {
  const { documents, vehicleData, resetOnboarding } = useOnboardingStore();
  const { submitApplication } = useOnboardingMutations();
  const { isFetching: isFetchingDrafts, refetch: refetchDrafts } = useDraftDocuments();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/vehicle' as any);
    }
  };

  const checkDocMissing = (type: DocumentType): string | null => {
    const state = documents[type];
    const docName = documentLabels[type] || type;

    if (!state || state.uploadStatus !== 'uploaded' || !state.filePath) {
      return docName;
    }

    const hasDates = !!state.metadata?.issuedAt && !!state.metadata?.expiresAt;
    if (!hasDates) {
      return `${docName} (Fechas de vigencia)`;
    }

    const isVehicleDoc = type === 'vehicle_title' || type === 'itv';
    if (isVehicleDoc && (!state.metadata?.documentNumber || state.metadata.documentNumber.trim() === '')) {
      return `${docName} (Número de trámite obligatorio)`;
    }

    const parsedMetadata = documentMetadataSchema.safeParse(state.metadata);
    if (!parsedMetadata.success) {
      return `${docName} (Revisá los datos ingresados)`;
    }

    return null;
  };

  const getMissingList = (types: DocumentType[]): string[] => {
    const missing: string[] = [];
    for (const t of types) {
      const err = checkDocMissing(t);
      if (err) missing.push(err);
    }
    return missing;
  };

  const missingPersonalDocs = getMissingList(personalDocumentTypes);
  const missingVehicleDocs = getMissingList(vehicleDocumentTypes);
  const totalMissing = missingPersonalDocs.length + missingVehicleDocs.length;

  const personalUploadedCount = personalDocumentTypes.length - missingPersonalDocs.length;
  const canSubmit = totalMissing === 0 && vehicleData !== null;

  const handleSubmit = () => {
    if (!vehicleData) {
      Alert.alert('Faltan datos', 'Por favor completá los datos del vehículo en el paso anterior.');
      return;
    }

    if (missingVehicleDocs.length > 0) {
      Alert.alert(
        'Documentación del vehículo pendiente',
        `Faltan completar documentos del vehículo:\n• ${missingVehicleDocs.join('\n• ')}\n\nPor favor volvé al paso 2 para cargarlos.`,
        [
          { text: 'Ir al vehículo', onPress: () => router.replace('/onboarding/vehicle' as any) },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
      return;
    }

    if (missingPersonalDocs.length > 0) {
      Alert.alert('Documentación incompleta', 'Por favor subí todos los documentos obligatorios antes de continuar.');
      return;
    }

    submitApplication.mutate({ vehicleData, documents }, {
      onSuccess: () => {
        resetOnboarding();
        router.replace('/pending-approval' as any);
      },
      onError: (err: any) => {
        const message = err?.response?.data?.error?.message || 'Error al enviar la solicitud.';
        Alert.alert('Error', message);
        console.error(err);
      }
    });
  };

  return (
    <View className="flex-1 bg-obsidian">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{
          paddingTop: Platform.OS === 'android' ? 36 : 24,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isFetchingDrafts}
            onRefresh={refetchDrafts}
            tintColor="#C5A059"
            colors={['#C5A059']}
          />
        }
      >
        {/* Back Button */}
        <TouchableOpacity 
          onPress={handleBack}
          className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 items-center justify-center mb-6 active:scale-95"
          activeOpacity={0.7}
          accessibilityLabel="Volver al paso anterior"
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Progress Stepper */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gold font-montserrat-semibold text-xs tracking-wider uppercase">
              Paso 3 de 3
            </Text>
            <Text className="text-platinum font-montserrat-medium text-xs">
              {personalUploadedCount} de {personalDocumentTypes.length} completados
            </Text>
          </View>
          <View className="flex-row gap-2 h-1.5 w-full">
            <View className="flex-1 bg-gold rounded-full" />
            <View className="flex-1 bg-gold rounded-full" />
            <View className="flex-1 bg-gold rounded-full" />
          </View>
        </View>

        {/* Header Title */}
        <View className="mb-6">
          <Text className="text-2xl font-montserrat-bold text-platinum mb-1.5">
            Documentación Personal
          </Text>
          <Text className="text-ash font-montserrat text-sm leading-5">
            Cargá los 6 documentos requeridos en formato legible o PDF. Todos exigen fechas de vigencia (emisión y vencimiento).
          </Text>
        </View>

        {/* Vehicle Docs Warning Banner (si faltara alguno del paso anterior) */}
        {missingVehicleDocs.length > 0 && (
          <TouchableOpacity
            onPress={() => router.replace('/onboarding/vehicle' as any)}
            activeOpacity={0.8}
            className="rounded-2xl p-4 mb-4 border flex-row items-center justify-between"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            <View className="flex-1 pr-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="car-outline" size={18} color="#F87171" style={{ marginRight: 6 }} />
                <Text className="text-red-400 font-montserrat-semibold text-sm">
                  Documentación del Vehículo Pendiente
                </Text>
              </View>
              <Text className="text-ash font-montserrat text-xs leading-4">
                Faltan: {missingVehicleDocs.join(', ')}. Tocá acá para volver al paso 2 y completarlos.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F87171" />
          </TouchableOpacity>
        )}

        {/* Status Callout Banner */}
        {missingPersonalDocs.length > 0 ? (
          <View
            className="rounded-2xl p-4 mb-6 border"
            style={{ backgroundColor: 'rgba(69, 26, 3, 0.25)', borderColor: 'rgba(212, 175, 55, 0.35)' }}
          >
            <View className="flex-row items-center mb-1">
              <Ionicons name="information-circle-outline" size={18} color="#D4AF37" style={{ marginRight: 6 }} />
              <Text className="text-gold font-montserrat-semibold text-sm">
                Documentación Personal Pendiente ({missingPersonalDocs.length})
              </Text>
            </View>
            <Text className="text-ash font-montserrat text-xs leading-4">
              Te falta completar: {missingPersonalDocs.join(', ')}. Una vez cargados todos los archivos habilitarás el envío para la revisión.
            </Text>
          </View>
        ) : (
          <View
            className="rounded-2xl p-4 mb-6 flex-row items-center border"
            style={{ backgroundColor: 'rgba(6, 78, 59, 0.25)', borderColor: 'rgba(52, 211, 153, 0.4)' }}
          >
            <Ionicons name="checkmark-done-circle" size={24} color="#34D399" style={{ marginRight: 10 }} />
            <View className="flex-1">
              <Text className="text-emerald-400 font-montserrat-semibold text-sm">
                Legajo Completo
              </Text>
              <Text className="text-ash font-montserrat text-xs">
                Ya podés enviar tu solicitud para aprobación final.
              </Text>
            </View>
          </View>
        )}

        {/* Document Items List */}
        {personalDocumentTypes.map((type, index) => (
          <DocumentItem
            key={type}
            type={type}
            stepIndex={index + 1}
            totalSteps={personalDocumentTypes.length}
          />
        ))}

        {/* Action Button */}
        <View className="mt-4 mb-8">
          <Button
            label={submitApplication.isPending ? 'Enviando Legajo...' : 'Enviar Solicitud a Revisión'}
            variant="primary"
            disabled={!canSubmit || submitApplication.isPending}
            isLoading={submitApplication.isPending}
            onPress={handleSubmit}
          />
          {!canSubmit && !submitApplication.isPending && (
            <Text className="text-ash font-montserrat text-xs text-center mt-2.5">
              {totalMissing > 0 
                ? `Completá los ${totalMissing} ${totalMissing === 1 ? 'documento pendiente' : 'documentos pendientes'} para habilitar el envío.`
                : 'Completá los datos del vehículo en el paso anterior para continuar.'}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}


