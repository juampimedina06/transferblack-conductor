import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_COLORS } from '../../../core/constants/theme';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import {
  DOCUMENT_HELP_DATA,
  DocumentScannerModal,
} from '../../components/ui/DocumentScannerModal';
import { DocumentType, useOnboardingStore } from '../store/useOnboardingStore';
import { useOnboardingMutations } from '../hooks/useOnboardingMutations';
import { documentMetadataSchema } from '../schemas/onboarding.schema';
import {
  DOCUMENT_CATALOG,
  resolveDocumentPreviewUri,
} from '../constants/documentCatalog';

interface DocumentUploadModalProps {
  visible: boolean;
  type: DocumentType;
  stepIndex: number;
  totalSteps: number;
  onClose: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  visible,
  type,
  stepIndex,
  totalSteps,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const documentState = useOnboardingStore((state) => state.documents[type]);
  const setDocumentState = useOnboardingStore((state) => state.setDocumentState);
  const { uploadDocument, deleteDocument } = useOnboardingMutations();

  const catalog = DOCUMENT_CATALOG[type];
  const helpInfo = DOCUMENT_HELP_DATA[type];

  const [docNumber, setDocNumber] = useState(documentState.metadata?.documentNumber ?? '');
  const [issuedAt, setIssuedAt] = useState(documentState.metadata?.issuedAt ?? '');
  const [expiresAt, setExpiresAt] = useState(documentState.metadata?.expiresAt ?? '');
  const [lastSyncedMeta, setLastSyncedMeta] = useState({
    documentNumber: documentState.metadata?.documentNumber ?? '',
    issuedAt: documentState.metadata?.issuedAt ?? '',
    expiresAt: documentState.metadata?.expiresAt ?? '',
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [showWhereToGet, setShowWhereToGet] = useState(false);
  const [uploadErrorText, setUploadErrorText] = useState<string | null>(null);

  // Sincroniza campos al rehidratar borradores sin usar setState dentro de useEffect
  const storeDocNum = documentState.metadata?.documentNumber ?? '';
  const storeIssued = documentState.metadata?.issuedAt ?? '';
  const storeExpires = documentState.metadata?.expiresAt ?? '';
  if (
    lastSyncedMeta.documentNumber !== storeDocNum ||
    lastSyncedMeta.issuedAt !== storeIssued ||
    lastSyncedMeta.expiresAt !== storeExpires
  ) {
    setLastSyncedMeta({
      documentNumber: storeDocNum,
      issuedAt: storeIssued,
      expiresAt: storeExpires,
    });
    setDocNumber(storeDocNum);
    setIssuedAt(storeIssued);
    setExpiresAt(storeExpires);
  }

  const isUploaded = documentState.uploadStatus === 'uploaded' && Boolean(documentState.filePath);
  const isUploading = documentState.uploadStatus === 'uploading' || uploadDocument.isPending;
  const hasUploadError = documentState.uploadStatus === 'error';

  const previewUri = resolveDocumentPreviewUri(
    documentState.localUri,
    documentState.fileUrl,
    documentState.filePath
  );
  const isPdf =
    documentState.mimeType === 'application/pdf' ||
    Boolean(previewUri?.toLowerCase().endsWith('.pdf'));
  const isImage = !isPdf && Boolean(previewUri);

  const parsedMeta = documentMetadataSchema.safeParse({
    documentNumber: docNumber || null,
    issuedAt: issuedAt || null,
    expiresAt: expiresAt || null,
  });
  const dateRangeError =
    issuedAt && expiresAt && !parsedMeta.success
      ? parsedMeta.error.issues[0]?.message ?? 'Revisá las fechas ingresadas'
      : null;

  const isMissingNumber = catalog.requiresDocumentNumber && docNumber.trim().length === 0;
  const isReadyToSave =
    isUploaded &&
    Boolean(issuedAt) &&
    Boolean(expiresAt) &&
    !isMissingNumber &&
    !dateRangeError;

  const getMissingReason = (): string | null => {
    if (isUploading) return 'Esperá a que termine la subida del archivo...';
    if (!isUploaded) return 'Subí una foto o PDF del documento para continuar.';
    if (!issuedAt) return 'Ingresá la fecha de emisión que figura en el documento.';
    if (!expiresAt) return 'Ingresá la fecha de vencimiento del documento.';
    if (dateRangeError) return dateRangeError;
    if (isMissingNumber) return `Ingresá el ${catalog.docNumberLabel.toLowerCase()}.`;
    return null;
  };

  const persistMetadata = (next: {
    documentNumber: string;
    issuedAt: string;
    expiresAt: string;
  }) => {
    setDocumentState(type, {
      metadata: {
        documentNumber: next.documentNumber.trim() || null,
        issuedAt: next.issuedAt || null,
        expiresAt: next.expiresAt || null,
      },
    });
  };

  const handleUpload = (uri: string, mimeType: string) => {
    setUploadErrorText(null);
    setDocumentState(type, {
      localUri: uri,
      mimeType,
      metadata: {
        documentNumber: docNumber.trim() || null,
        issuedAt: issuedAt || null,
        expiresAt: expiresAt || null,
      },
    });

    uploadDocument.mutate(
      {
        fileUri: uri,
        mimeType,
        type,
        issuedAt: issuedAt || null,
        expiresAt: expiresAt || null,
      },
      {
        onSuccess: () => {
          setUploadErrorText(null);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        },
        onError: () => {
          setUploadErrorText(
            'No se pudo subir el archivo. Revisá tu conexión e intentá nuevamente.'
          );
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        },
      }
    );
  };

  const handleRetryUpload = () => {
    if (!documentState.localUri) {
      setIsScannerOpen(true);
      return;
    }
    handleUpload(documentState.localUri, documentState.mimeType || 'image/jpeg');
  };

  const handlePickFromGallery = async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Permiso de galería requerido',
            `Para elegir la foto de tu ${catalog.label.toLowerCase()}, habilitá el acceso a fotos desde los Ajustes del sistema.`,
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }

        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert(
            'Permiso de galería denegado',
            'Sin acceso a la galería no podemos elegir la imagen. Podés habilitarlo en Ajustes o usar la cámara.',
            [
              { text: 'Entendido', style: 'cancel' },
              { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.75,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        handleUpload(asset.uri, asset.mimeType || 'image/jpeg');
      }
    } catch {
      Alert.alert(
        'No se pudo abrir la galería',
        'Ocurrió un problema al seleccionar la imagen. Intentá nuevamente.'
      );
    }
  };

  const handlePickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        handleUpload(asset.uri, asset.mimeType || 'application/pdf');
      }
    } catch {
      Alert.alert(
        'No se pudo leer el PDF',
        'Verificá que el archivo no esté dañado e intentá nuevamente.'
      );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar archivo',
      `¿Querés quitar el archivo actual de ${catalog.label}? Vas a poder subir otro cuando quieras.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteDocument.mutate(type, {
              onSuccess: () => {
                setUploadErrorText(null);
              },
              onError: () => {
                Alert.alert('Error', 'No se pudo eliminar el archivo. Reintentá.');
              },
            });
          },
        },
      ]
    );
  };

  const handleSaveAndClose = () => {
    persistMetadata({ documentNumber: docNumber, issuedAt, expiresAt });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
  };

  const missingReason = getMissingReason();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-obsidian"
      >
        {/* Top Bar */}
        <View
          className="px-5 pb-3.5 border-b border-white/10 flex-row items-center justify-between bg-obsidian"
          style={{ paddingTop: Platform.OS === 'android' ? Math.max(insets.top, 16) : 16 }}
        >
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Cerrar pantalla de documento"
          >
            <Ionicons name="close" size={22} color={THEME_COLORS.platinum} />
          </TouchableOpacity>

          <View className="flex-1 items-center px-3">
            <Text className="text-gold font-montserrat-semibold text-[11px] uppercase tracking-widest">
              Documento {stepIndex} de {totalSteps}
            </Text>
            <Text
              className="text-platinum font-montserrat-bold text-sm mt-0.5 text-center"
              numberOfLines={1}
            >
              {catalog.label}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowWhereToGet((prev) => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Mostrar dónde obtener este documento"
          >
            <Ionicons
              name={showWhereToGet ? 'help-circle' : 'help-circle-outline'}
              size={22}
              color={THEME_COLORS.gold}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Guía rápida estilo Uber */}
          <View className="rounded-2xl p-4 mb-5 bg-[#12131A] border border-white/10">
            <View className="flex-row items-center mb-2.5">
              <View className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 items-center justify-center mr-3">
                <Ionicons name={catalog.icon} size={20} color={THEME_COLORS.gold} />
              </View>
              <View className="flex-1">
                <Text className="text-platinum font-montserrat-bold text-sm">
                  Cómo sacar una buena toma
                </Text>
                <Text className="text-ash font-montserrat text-xs mt-0.5">
                  {helpInfo.subtitle}
                </Text>
              </View>
            </View>

            <View className="gap-1.5 mt-1">
              {helpInfo.tips.map((tip) => (
                <View key={tip} className="flex-row items-start">
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={THEME_COLORS.gold}
                    style={{ marginTop: 1, marginRight: 8 }}
                  />
                  <Text className="text-platinum/90 font-montserrat text-xs flex-1 leading-4">
                    {tip}
                  </Text>
                </View>
              ))}
            </View>

            {showWhereToGet && (
              <View className="mt-3 pt-3 border-t border-white/10">
                <Text className="text-gold font-montserrat-semibold text-[11px] uppercase tracking-wider mb-1">
                  ¿Dónde se obtiene?
                </Text>
                <Text className="text-ash font-montserrat text-xs leading-4">
                  {helpInfo.whereToGet}
                </Text>
              </View>
            )}
          </View>

          {/* Paso 1: Archivo del documento */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-platinum font-montserrat-bold text-sm">
                1. Subí el archivo
              </Text>
              {isUploaded && (
                <View className="flex-row items-center bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                  <Ionicons name="checkmark-circle" size={13} color="#34D399" />
                  <Text className="text-emerald-400 font-montserrat-semibold text-[11px] ml-1">
                    Cargado
                  </Text>
                </View>
              )}
            </View>

            {isUploading ? (
              <View className="rounded-2xl p-6 bg-[#12131A] border border-gold/40 items-center justify-center">
                <ActivityIndicator size="large" color={THEME_COLORS.gold} />
                <Text className="text-platinum font-montserrat-semibold text-sm mt-3">
                  Subiendo documento...
                </Text>
                <Text className="text-ash font-montserrat text-xs mt-1 text-center">
                  Esto tarda solo unos segundos.
                </Text>
              </View>
            ) : isUploaded && previewUri ? (
              <View className="rounded-2xl overflow-hidden bg-[#12131A] border border-emerald-500/35">
                {isImage ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setIsViewerOpen(true)}
                    className="w-full h-48 bg-black items-center justify-center relative"
                    accessibilityRole="button"
                    accessibilityLabel="Ampliar vista previa del documento"
                  >
                    <Image
                      source={{ uri: previewUri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="contain"
                      transition={200}
                    />
                    <View className="absolute bottom-3 right-3 flex-row items-center px-3 py-1.5 rounded-full bg-black/80 border border-white/20">
                      <Ionicons name="expand-outline" size={14} color={THEME_COLORS.gold} />
                      <Text className="text-platinum font-montserrat-medium text-xs ml-1.5">
                        Ampliar
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View className="p-4 flex-row items-center bg-black/40">
                    <View className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 items-center justify-center mr-3">
                      <Ionicons name="document-text" size={26} color="#F59E0B" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-platinum font-montserrat-semibold text-sm">
                        Archivo PDF adjunto
                      </Text>
                      <Text className="text-ash font-montserrat text-xs mt-0.5">
                        Listo para verificación del equipo
                      </Text>
                    </View>
                  </View>
                )}

                <View className="flex-row items-center justify-between px-3.5 py-2.5 border-t border-white/10">
                  <TouchableOpacity
                    onPress={() => setIsScannerOpen(true)}
                    activeOpacity={0.75}
                    className="flex-row items-center py-2 px-3 rounded-xl bg-white/5 border border-white/10"
                    accessibilityRole="button"
                    accessibilityLabel="Reemplazar foto del documento"
                  >
                    <Ionicons name="camera-outline" size={16} color={THEME_COLORS.gold} />
                    <Text className="text-gold font-montserrat-semibold text-xs ml-1.5">
                      Reemplazar
                    </Text>
                  </TouchableOpacity>

                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={handlePickPdf}
                      activeOpacity={0.75}
                      className="flex-row items-center py-2 px-3 rounded-xl bg-white/5 border border-white/10"
                      accessibilityRole="button"
                      accessibilityLabel="Reemplazar por archivo PDF"
                    >
                      <Ionicons name="document-outline" size={15} color={THEME_COLORS.platinum} />
                      <Text className="text-platinum font-montserrat-medium text-xs ml-1">
                        PDF
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleDelete}
                      disabled={deleteDocument.isPending}
                      activeOpacity={0.75}
                      className="flex-row items-center py-2 px-3 rounded-xl bg-red-500/10 border border-red-500/30"
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar archivo"
                    >
                      {deleteDocument.isPending ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View className="rounded-2xl p-4 bg-[#12131A] border border-dashed border-gold/40">
                <TouchableOpacity
                  onPress={() => setIsScannerOpen(true)}
                  activeOpacity={0.85}
                  className="w-full py-4 rounded-xl bg-gold flex-row items-center justify-center mb-3"
                  accessibilityRole="button"
                  accessibilityLabel="Escanear documento con cámara"
                >
                  <Ionicons name="camera" size={20} color={THEME_COLORS.obsidian} />
                  <Text className="text-obsidian font-montserrat-bold text-sm ml-2">
                    Escanear con cámara
                  </Text>
                </TouchableOpacity>

                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={handlePickFromGallery}
                    activeOpacity={0.75}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/15 flex-row items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Elegir imagen desde galería"
                  >
                    <Ionicons name="images-outline" size={18} color={THEME_COLORS.platinum} />
                    <Text className="text-platinum font-montserrat-semibold text-xs ml-2">
                      Galería
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePickPdf}
                    activeOpacity={0.75}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/15 flex-row items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Adjuntar archivo PDF"
                  >
                    <Ionicons name="document-text-outline" size={18} color={THEME_COLORS.platinum} />
                    <Text className="text-platinum font-montserrat-semibold text-xs ml-2">
                      Subir PDF
                    </Text>
                  </TouchableOpacity>
                </View>

                {catalog.acceptsPdfRecommended && (
                  <Text className="text-ash font-montserrat text-[11px] text-center mt-2.5">
                    Tip: si ya descargaste el PDF oficial, podés adjuntarlo directo.
                  </Text>
                )}
              </View>
            )}

            {(hasUploadError || uploadErrorText) && !isUploading && (
              <View className="mt-3 rounded-xl p-3.5 bg-red-500/10 border border-red-500/35 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                  <Ionicons name="alert-circle" size={18} color="#F87171" />
                  <Text className="text-red-300 font-montserrat text-xs ml-2 flex-1 leading-4">
                    {uploadErrorText || 'Falló la subida del documento. Reintentá.'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleRetryUpload}
                  activeOpacity={0.75}
                  className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-400/40"
                  accessibilityRole="button"
                  accessibilityLabel="Reintentar subida"
                >
                  <Text className="text-red-200 font-montserrat-semibold text-xs">
                    Reintentar
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Paso 2: Fechas y datos del documento */}
          <View className="mb-4">
            <Text className="text-platinum font-montserrat-bold text-sm mb-1">
              2. Vigencia y datos
            </Text>
            <Text className="text-ash font-montserrat text-xs mb-3.5 leading-4">
              Copiá las fechas exactamente como figuran en tu documento.
            </Text>

            <View className="rounded-2xl p-4 bg-[#12131A] border border-white/10">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <DatePickerInput
                    label="Emisión *"
                    placeholder="Elegir fecha"
                    value={issuedAt}
                    containerClassName="mb-3"
                    minYear={2015}
                    maxYear={new Date().getFullYear()}
                    title="Fecha de Emisión"
                    onChangeDate={(dateStr) => {
                      setIssuedAt(dateStr);
                      persistMetadata({
                        documentNumber: docNumber,
                        issuedAt: dateStr,
                        expiresAt,
                      });
                    }}
                  />
                </View>
                <View className="flex-1">
                  <DatePickerInput
                    label="Vencimiento *"
                    placeholder="Elegir fecha"
                    value={expiresAt}
                    containerClassName="mb-3"
                    minYear={new Date().getFullYear()}
                    maxYear={new Date().getFullYear() + 15}
                    title="Fecha de Vencimiento"
                    onChangeDate={(dateStr) => {
                      setExpiresAt(dateStr);
                      persistMetadata({
                        documentNumber: docNumber,
                        issuedAt,
                        expiresAt: dateStr,
                      });
                    }}
                  />
                </View>
              </View>

              {dateRangeError && (
                <View className="flex-row items-center mb-3 -mt-1">
                  <Ionicons name="alert-circle-outline" size={14} color="#F87171" />
                  <Text className="text-red-400 font-montserrat text-xs ml-1.5 flex-1">
                    {dateRangeError}
                  </Text>
                </View>
              )}

              <View>
                <Text className="text-ash font-montserrat-medium text-xs mb-1.5">
                  {catalog.docNumberLabel}
                  {catalog.requiresDocumentNumber ? ' *' : ''}
                </Text>
                <TextInput
                  placeholder={catalog.docNumberPlaceholder}
                  placeholderTextColor={THEME_COLORS.ashMuted}
                  value={docNumber}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onChangeText={(val) => {
                    setDocNumber(val);
                    persistMetadata({
                      documentNumber: val,
                      issuedAt,
                      expiresAt,
                    });
                  }}
                  className="h-12 bg-white/5 text-platinum font-montserrat text-sm px-3.5 rounded-xl border border-white/10"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <View
          className="px-5 pt-3 border-t border-white/10 bg-obsidian"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {missingReason && (
            <Text className="text-ash font-montserrat text-xs text-center mb-2.5">
              {missingReason}
            </Text>
          )}
          <TouchableOpacity
            onPress={handleSaveAndClose}
            disabled={!isReadyToSave}
            activeOpacity={0.85}
            className={`w-full py-4 rounded-2xl items-center justify-center flex-row ${
              isReadyToSave ? 'bg-gold' : 'bg-white/10'
            }`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isReadyToSave }}
            accessibilityLabel="Guardar documento"
          >
            <Ionicons
              name={isReadyToSave ? 'checkmark-circle' : 'lock-closed-outline'}
              size={18}
              color={isReadyToSave ? THEME_COLORS.obsidian : THEME_COLORS.ash}
            />
            <Text
              className={`font-montserrat-bold text-sm ml-2 ${
                isReadyToSave ? 'text-obsidian' : 'text-ash'
              }`}
            >
              {isReadyToSave ? 'Guardar y continuar' : 'Completá los pasos para guardar'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Visor de imagen pantalla completa */}
      <Modal
        visible={isViewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsViewerOpen(false)}
      >
        <View className="flex-1 bg-black/95 justify-between">
          <View
            className="px-5 pb-4 flex-row items-center justify-between border-b border-white/10"
            style={{ paddingTop: Math.max(insets.top, 20) }}
          >
            <Text className="text-platinum font-montserrat-semibold text-base flex-1 pr-3" numberOfLines={1}>
              {catalog.label}
            </Text>
            <TouchableOpacity
              onPress={() => setIsViewerOpen(false)}
              className="w-11 h-11 rounded-full bg-white/10 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Cerrar vista previa"
            >
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 p-4 items-center justify-center">
            {previewUri && (
              <Image
                source={{ uri: previewUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                transition={200}
              />
            )}
          </View>

          <View
            className="px-5 pt-3 border-t border-white/10 items-end"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            <TouchableOpacity
              onPress={() => setIsViewerOpen(false)}
              className="bg-gold px-5 py-2.5 rounded-xl"
            >
              <Text className="text-obsidian font-montserrat-bold text-xs">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Escáner guiado de cámara */}
      <DocumentScannerModal
        visible={isScannerOpen}
        docType={type}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onClose={() => setIsScannerOpen(false)}
        onPhotoCaptured={(uri, mimeType) => handleUpload(uri, mimeType)}
        onPickFromGallery={() => {
          setIsScannerOpen(false);
          setTimeout(() => {
            void handlePickFromGallery();
          }, 350);
        }}
      />
    </Modal>
  );
};
