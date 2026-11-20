import React from 'react';
import { View, Text, ScrollView, Platform, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentType, useOnboardingStore } from '../../presentation/onboarding/store/useOnboardingStore';
import { useOnboardingMutations, useDraftDocuments } from '../../presentation/onboarding/hooks/useOnboardingMutations';
import { DocumentItem } from '../../presentation/onboarding/components/DocumentItem';
import { DOCUMENT_CATALOG } from '../../presentation/onboarding/constants/documentCatalog';
import { documentMetadataSchema } from '../../presentation/onboarding/schemas/onboarding.schema';
import { Button } from '../../presentation/components/ui/Button';
import { showBannerNotification } from '../../presentation/notifications/store/useBannerNotificationStore';
import { THEME_COLORS } from '../../core/constants/theme';

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

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
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
    const catalog = DOCUMENT_CATALOG[type];

    if (!state || state.uploadStatus !== 'uploaded' || !state.filePath) {
      return catalog.label;
    }

    const hasDates = Boolean(state.metadata?.issuedAt) && Boolean(state.metadata?.expiresAt);
    if (!hasDates) {
      return `${catalog.label} (fechas de vigencia)`;
    }

    if (
      catalog.requiresDocumentNumber &&
      (!state.metadata?.documentNumber || state.metadata.documentNumber.trim() === '')
    ) {
      return `${catalog.label} (número de trámite obligatorio)`;
    }

    const parsedMetadata = documentMetadataSchema.safeParse(state.metadata);
    if (!parsedMetadata.success) {
      return `${catalog.label} (revisá las fechas ingresadas)`;
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

  const personalCompletedCount = personalDocumentTypes.length - missingPersonalDocs.length;
  const progressPercent = Math.round(
    (personalCompletedCount / personalDocumentTypes.length) * 100
  );
  const firstPendingType =
    personalDocumentTypes.find((t) => checkDocMissing(t) !== null) ?? null;

  const canSubmit = totalMissing === 0 && vehicleData !== null;

  const handleSubmit = () => {
    if (!vehicleData) {
      showBannerNotification({
        type: 'warning',
        title: 'Faltan datos del vehículo',
        message: 'Completá los datos del vehículo en el paso anterior.',
        actionLabel: 'Ir al paso 2',
        onPress: () => router.replace('/onboarding/vehicle' as any),
      });
      return;
    }

    if (missingVehicleDocs.length > 0) {
      showBannerNotification({
        type: 'warning',
        title: 'Faltan documentos del vehículo',
        message: `Pendientes: ${missingVehicleDocs.join(', ')}.`,
        actionLabel: 'Completar',
        onPress: () => router.replace('/onboarding/vehicle' as any),
        durationMs: 5500,
      });
      return;
    }

    if (missingPersonalDocs.length > 0) {
      showBannerNotification({
        type: 'warning',
        title: 'Documentación incompleta',
        message: 'Completá todos los documentos requeridos antes de enviar.',
      });
      return;
    }

    submitApplication.mutate(
      { vehicleData, documents },
      {
        onSuccess: () => {
          void resetOnboarding();
          showBannerNotification({
            type: 'success',
            title: 'Solicitud enviada',
            message: 'Tu legajo ya está en revisión por nuestro equipo.',
          });
          router.replace('/pending-approval' as any);
        },
        onError: (err: unknown) => {
          const apiErr = err as {
            response?: { data?: { error?: { code?: string; message?: string } } };
          };
          const code = apiErr?.response?.data?.error?.code;

          // Si el primer envío sí se guardó en el backend pero falló la respuesta en red,
          // recuperar de forma idempotente llevando al conductor directo a revisión.
          if (code === 'DRIVER_ALREADY_EXISTS') {
            void resetOnboarding();
            showBannerNotification({
              type: 'success',
              title: 'Tu solicitud ya está registrada',
              message: 'Te llevamos a ver el estado de tu revisión.',
            });
            router.replace('/pending-approval' as any);
            return;
          }

          const message =
            apiErr?.response?.data?.error?.message ||
            'No se pudo enviar tu solicitud. Intentá nuevamente.';
          showBannerNotification({
            type: 'error',
            title: 'Error al enviar el legajo',
            message,
          });
        },
      }
    );
  };

  return (
    <View className="flex-1 bg-obsidian">
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{
          paddingTop: Platform.OS === 'android' ? 20 : 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isFetchingDrafts}
            onRefresh={refetchDrafts}
            tintColor={THEME_COLORS.gold}
            colors={[THEME_COLORS.gold]}
          />
        }
      >
        {/* Top Row: Back + Step pill */}
        <View className="flex-row items-center justify-between mb-5">
          <TouchableOpacity
            onPress={handleBack}
            className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 items-center justify-center"
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver al paso anterior"
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>

          <View className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Text className="text-gold font-montserrat-semibold text-xs tracking-wider uppercase">
              Paso 3 de 3
            </Text>
          </View>
        </View>

        {/* Header Title */}
        <View className="mb-5">
          <Text className="text-2xl font-montserrat-bold text-platinum mb-1.5">
            Tu documentación
          </Text>
          <Text className="text-ash font-montserrat text-sm leading-5">
            Tocá cada documento para escanearlo o adjuntar el PDF. Podés cargarlos en el orden que prefieras.
          </Text>
        </View>

        {/* Progress Card estilo Uber */}
        <View className="rounded-2xl p-4 mb-5 bg-[#12131A] border border-white/10">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-platinum font-montserrat-semibold text-xs">
              Progreso del legajo
            </Text>
            <Text className="text-gold font-montserrat-bold text-xs">
              {personalCompletedCount} de {personalDocumentTypes.length} listos
            </Text>
          </View>
          <View className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <View
              className={`h-full rounded-full ${
                personalCompletedCount === personalDocumentTypes.length
                  ? 'bg-emerald-400'
                  : 'bg-gold'
              }`}
              style={{ width: `${Math.max(progressPercent, 4)}%` }}
            />
          </View>
        </View>

        {/* Vehicle Docs Warning Banner */}
        {missingVehicleDocs.length > 0 && (
          <TouchableOpacity
            onPress={() => router.replace('/onboarding/vehicle' as any)}
            activeOpacity={0.8}
            className="rounded-2xl p-4 mb-4 border flex-row items-center justify-between"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.35)',
            }}
            accessibilityRole="button"
            accessibilityLabel="Volver al paso 2 para completar documentación del vehículo"
          >
            <View className="flex-1 pr-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="car-outline" size={17} color="#F87171" style={{ marginRight: 6 }} />
                <Text className="text-red-400 font-montserrat-semibold text-sm">
                  Faltan documentos del vehículo
                </Text>
              </View>
              <Text className="text-ash font-montserrat text-xs leading-4">
                Pendientes: {missingVehicleDocs.join(', ')}. Tocá acá para volver al paso 2.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F87171" />
          </TouchableOpacity>
        )}

        {/* Checklist de documentos */}
        <Text className="text-ash font-montserrat-semibold text-[11px] uppercase tracking-widest mb-3">
          Documentos requeridos
        </Text>

        {personalDocumentTypes.map((type, index) => (
          <DocumentItem
            key={type}
            type={type}
            stepIndex={index + 1}
            totalSteps={personalDocumentTypes.length}
            isNextSuggested={type === firstPendingType}
          />
        ))}
      </ScrollView>

      {/* Sticky Footer */}
      <View
        className="px-5 pt-3 border-t border-white/10 bg-obsidian"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row items-center justify-center mb-2.5">
          <Ionicons name="lock-closed-outline" size={13} color={THEME_COLORS.ash} />
          <Text className="text-ash font-montserrat text-[11px] ml-1.5">
            Tus datos se envían encriptados y solo para verificación
          </Text>
        </View>

        <Button
          label={
            submitApplication.isPending
              ? 'Enviando legajo...'
              : canSubmit
                ? 'Enviar solicitud a revisión'
                : totalMissing > 0
                  ? `Faltan ${totalMissing} ${totalMissing === 1 ? 'documento' : 'documentos'}`
                  : 'Completá los datos del vehículo'
          }
          variant="primary"
          disabled={!canSubmit || submitApplication.isPending}
          isLoading={submitApplication.isPending}
          onPress={handleSubmit}
        />
      </View>
    </View>
  );
}
