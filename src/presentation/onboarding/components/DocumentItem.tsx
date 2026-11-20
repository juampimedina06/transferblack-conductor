import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';
import { DocumentType, useOnboardingStore } from '../store/useOnboardingStore';
import { documentMetadataSchema } from '../schemas/onboarding.schema';
import {
  DOCUMENT_CATALOG,
  formatDisplayDate,
  resolveDocumentPreviewUri,
} from '../constants/documentCatalog';
import { DocumentUploadModal } from './DocumentUploadModal';

interface DocumentItemProps {
  type: DocumentType;
  stepIndex?: number;
  totalSteps?: number;
  isNextSuggested?: boolean;
}

export const DocumentItem: React.FC<DocumentItemProps> = ({
  type,
  stepIndex = 1,
  totalSteps = 8,
  isNextSuggested = false,
}) => {
  const documentState = useOnboardingStore((state) => state.documents[type]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const catalog = DOCUMENT_CATALOG[type];
  const metadata = documentState.metadata;
  const isUploaded = documentState.uploadStatus === 'uploaded' && Boolean(documentState.filePath);
  const isUploading = documentState.uploadStatus === 'uploading';
  const hasError = documentState.uploadStatus === 'error';

  const hasDates = Boolean(metadata?.issuedAt) && Boolean(metadata?.expiresAt);
  const hasRequiredNumber =
    !catalog.requiresDocumentNumber || Boolean(metadata?.documentNumber?.trim());
  const isMetadataValid =
    hasDates &&
    hasRequiredNumber &&
    documentMetadataSchema.safeParse(metadata).success;

  const isComplete = isUploaded && isMetadataValid;
  const isIncompleteAfterUpload = isUploaded && !isMetadataValid;

  const previewUri = resolveDocumentPreviewUri(
    documentState.localUri,
    documentState.fileUrl,
    documentState.filePath
  );
  const isPdf =
    documentState.mimeType === 'application/pdf' ||
    Boolean(previewUri?.toLowerCase().endsWith('.pdf'));
  const isImage = !isPdf && Boolean(previewUri);

  const borderColor = isComplete
    ? 'rgba(52, 211, 153, 0.35)'
    : hasError
      ? 'rgba(239, 68, 68, 0.45)'
      : isIncompleteAfterUpload
        ? 'rgba(245, 158, 11, 0.45)'
        : isNextSuggested
          ? 'rgba(212, 175, 55, 0.55)'
          : 'rgba(255, 255, 255, 0.1)';

  const backgroundColor = isComplete
    ? 'rgba(16, 22, 20, 0.92)'
    : isNextSuggested
      ? 'rgba(24, 21, 16, 0.95)'
      : 'rgba(18, 19, 26, 0.92)';

  const getSubtitle = (): { text: string; colorClass: string } => {
    if (isUploading) {
      return { text: 'Subiendo archivo...', colorClass: 'text-gold' };
    }
    if (hasError) {
      return { text: 'Error al subir · Tocá para reintentar', colorClass: 'text-red-400' };
    }
    if (isComplete) {
      const exp = formatDisplayDate(metadata?.expiresAt);
      return {
        text: exp ? `Listo · Vence ${exp}` : 'Documento completo',
        colorClass: 'text-emerald-400',
      };
    }
    if (isIncompleteAfterUpload) {
      return {
        text: catalog.requiresDocumentNumber
          ? 'Faltan fechas o N° de trámite'
          : 'Faltan fechas de vigencia',
        colorClass: 'text-amber-400',
      };
    }
    return { text: catalog.shortHint, colorClass: 'text-ash' };
  };

  const subtitle = getSubtitle();

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => setIsModalOpen(true)}
        className="p-3.5 mb-3 rounded-2xl border flex-row items-center"
        style={{ backgroundColor, borderColor }}
        accessibilityRole="button"
        accessibilityLabel={`${catalog.label}, ${subtitle.text}`}
      >
        {/* Left: Thumbnail o ícono de documento */}
        <View className="w-12 h-12 rounded-xl overflow-hidden items-center justify-center mr-3.5 relative bg-obsidian border border-white/10">
          {isUploading ? (
            <ActivityIndicator size="small" color={THEME_COLORS.gold} />
          ) : isImage && previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          ) : isPdf && isUploaded ? (
            <Ionicons name="document-text" size={22} color="#F59E0B" />
          ) : (
            <Ionicons
              name={catalog.icon}
              size={22}
              color={isNextSuggested ? THEME_COLORS.gold : THEME_COLORS.platinum}
            />
          )}

          {isComplete && (
            <View className="absolute bottom-0 right-0 bg-emerald-500 rounded-tl-lg px-1 py-0.5">
              <Ionicons name="checkmark" size={10} color="#0A0A0C" />
            </View>
          )}
          {isIncompleteAfterUpload && (
            <View className="absolute bottom-0 right-0 bg-amber-500 rounded-tl-lg px-1 py-0.5">
              <Ionicons name="alert" size={10} color="#0A0A0C" />
            </View>
          )}
          {hasError && (
            <View className="absolute bottom-0 right-0 bg-red-500 rounded-tl-lg px-1 py-0.5">
              <Ionicons name="close" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Center: Título + estado/guía */}
        <View className="flex-1 pr-2">
          <Text
            className="text-platinum font-montserrat-semibold text-sm leading-5"
            numberOfLines={1}
          >
            {catalog.label}
          </Text>
          <Text
            className={`${subtitle.colorClass} font-montserrat text-xs mt-0.5`}
            numberOfLines={1}
          >
            {subtitle.text}
          </Text>
        </View>

        {/* Right: Pill de acción + chevron */}
        <View className="flex-row items-center">
          {isComplete ? (
            <View className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 mr-1.5">
              <Text className="text-emerald-400 font-montserrat-semibold text-[11px]">
                Listo
              </Text>
            </View>
          ) : isIncompleteAfterUpload ? (
            <View className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 mr-1.5">
              <Text className="text-amber-400 font-montserrat-semibold text-[11px]">
                Completar
              </Text>
            </View>
          ) : hasError ? (
            <View className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 mr-1.5">
              <Text className="text-red-400 font-montserrat-semibold text-[11px]">
                Reintentar
              </Text>
            </View>
          ) : isNextSuggested ? (
            <View className="px-3 py-1 rounded-full bg-gold mr-1.5">
              <Text className="text-obsidian font-montserrat-bold text-[11px]">
                Subir
              </Text>
            </View>
          ) : (
            <View className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 mr-1.5">
              <Text className="text-platinum font-montserrat-medium text-[11px]">
                Subir
              </Text>
            </View>
          )}

          <Ionicons
            name="chevron-forward"
            size={16}
            color={isNextSuggested ? THEME_COLORS.gold : THEME_COLORS.ash}
          />
        </View>
      </TouchableOpacity>

      <DocumentUploadModal
        visible={isModalOpen}
        type={type}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
