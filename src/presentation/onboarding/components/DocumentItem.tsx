import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { DocumentType, useOnboardingStore } from '../store/useOnboardingStore';
import { useOnboardingMutations } from '../hooks/useOnboardingMutations';
import { THEME_COLORS } from '../../../core/constants/theme';
import { DatePickerInput } from '../../components/ui/DatePickerInput';
import { DocumentScannerModal } from '../../components/ui/DocumentScannerModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const documentLabels: Record<DocumentType, string> = {
  dni: 'DNI (Frente y Dorso)',
  license_d1: 'Licencia de Conducir (D1)',
  insurance_policy: 'Póliza de Seguro al Día',
  criminal_record_national: 'Antecedentes Penales Nacionales',
  criminal_record_provincial: 'Antecedentes Penales Provinciales',
  sex_offenses_registry: 'Registro de Ofensores Sexuales',
  vehicle_title: 'Título de Propiedad Automotor',
  itv: 'ITV / RTO (Revisión Técnica)',
};

interface DocumentItemProps {
  type: DocumentType;
  stepIndex?: number;
  totalSteps?: number;
}

export const DocumentItem: React.FC<DocumentItemProps> = ({
  type,
  stepIndex = 1,
  totalSteps = 8,
}) => {
  const documentState = useOnboardingStore((state) => state.documents[type]);
  const setDocumentState = useOnboardingStore((state) => state.setDocumentState);
  const { uploadDocument, deleteDocument } = useOnboardingMutations();

  const [docNumber, setDocNumber] = useState(documentState.metadata?.documentNumber || '');
  const [issuedAt, setIssuedAt] = useState(documentState.metadata?.issuedAt || '');
  const [expiresAt, setExpiresAt] = useState(documentState.metadata?.expiresAt || '');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const label = documentLabels[type];
  const isVehicleDoc = type === 'vehicle_title' || type === 'itv';
  const isUploaded = documentState.uploadStatus === 'uploaded';
  const isUploading = documentState.uploadStatus === 'uploading';

  const getPreviewUri = (): string | null => {
    if (documentState.localUri) return documentState.localUri;
    if (documentState.filePath) {
      if (
        documentState.filePath.startsWith('http://') ||
        documentState.filePath.startsWith('https://') ||
        documentState.filePath.startsWith('file://')
      ) {
        return documentState.filePath;
      }
      const apiBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') || '';
      return `${apiBase}/${documentState.filePath.replace(/^\//, '')}`;
    }
    return null;
  };

  const previewUri = getPreviewUri();
  const isPdf =
    documentState.mimeType === 'application/pdf' ||
    (previewUri ? previewUri.toLowerCase().endsWith('.pdf') : false);
  const isImage = !isPdf && !!previewUri;

  const isMetadataMissing = !issuedAt || !expiresAt;

  // Si ya está subido e ingresó metadatos inicia minimizado, si no, expandido
  const [isExpanded, setIsExpanded] = useState(!isUploaded || isMetadataMissing);

  // Skip LayoutAnimation en el primer render para no interferir con la transición del Stack
  const hasRendered = useRef(false);

  useEffect(() => {
    if (!hasRendered.current) {
      hasRendered.current = true;
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isUploaded && !isMetadataMissing) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [isUploaded, isMetadataMissing]);

  // Sincronizar campos cuando se rehidrata el borrador guardado
  useEffect(() => {
    setDocNumber(documentState.metadata?.documentNumber || '');
    setIssuedAt(documentState.metadata?.issuedAt || '');
    setExpiresAt(documentState.metadata?.expiresAt || '');
  }, [documentState.metadata]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();

        if (status !== 'granted') {
          if (!canAskAgain) {
            Alert.alert(
              "Permiso de cámara requerido",
              `Para fotografiar tu ${label.toLowerCase()}, TransferBlack necesita acceso a la cámara.\n\nPodés habilitarlo fácilmente desde los Ajustes del sistema.`,
              [
                { text: "Cancelar", style: "cancel" },
                { text: "Abrir Ajustes", onPress: () => Linking.openSettings() }
              ]
            );
            return;
          }

          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (!permissionResult.granted) {
            Alert.alert(
              "Permiso de cámara no concedido",
              `No se pudo acceder a la cámara para tomar la foto de tu ${label.toLowerCase()}.\n\nSi querés subirla con la cámara, podés autorizar el permiso desde Ajustes.`,
              [
                { text: "Entendido", style: "cancel" },
                { text: "Abrir Ajustes", onPress: () => Linking.openSettings() }
              ]
            );
            return;
          }
        }

        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
          if (!canAskAgain) {
            Alert.alert(
              "Permiso de fotos requerido",
              `Para seleccionar la foto de tu ${label.toLowerCase()}, TransferBlack necesita acceso a tu galería.\n\nPodés habilitarlo en los Ajustes del sistema.`,
              [
                { text: "Cancelar", style: "cancel" },
                { text: "Abrir Ajustes", onPress: () => Linking.openSettings() }
              ]
            );
            return;
          }

          const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permissionResult.granted) {
            Alert.alert(
              "Permiso de galería no concedido",
              `No se pudo acceder a tus fotos para cargar tu ${label.toLowerCase()}.\n\nPodés autorizarlo cuando quieras desde Ajustes.`,
              [
                { text: "Entendido", style: "cancel" },
                { text: "Abrir Ajustes", onPress: () => Linking.openSettings() }
              ]
            );
            return;
          }
        }

        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        handleUpload(asset.uri, asset.mimeType || 'image/jpeg');
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error al procesar imagen", "Ocurrió un problema al seleccionar el archivo. Por favor, reintentá.");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        handleUpload(asset.uri, asset.mimeType || 'application/pdf');
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error al cargar documento", "No se pudo abrir el archivo PDF seleccionado. Por favor, verificá el documento e intentá nuevamente.");
    }
  };

  const handleUpload = (uri: string, mimeType: string) => {
    setDocumentState(type, {
      localUri: uri,
      mimeType,
      metadata: { documentNumber: docNumber, issuedAt, expiresAt },
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
          Alert.alert('Archivo Subido', `${label} se cargó y verificó con éxito.`);
        },
        onError: () => {
          Alert.alert('Error', `No se pudo subir ${label}. Intentá nuevamente.`);
        },
      }
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar borrador',
      `¿Estás seguro de que querés borrar ${label}? Vas a tener que cargarlo nuevamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            deleteDocument.mutate(type, {
              onError: () => {
                Alert.alert('Error', `No se pudo borrar ${label}. Intentá nuevamente.`);
              },
            });
          },
        },
      ]
    );
  };

  const updateMetadata = () => {
    setDocumentState(type, {
      metadata: {
        documentNumber: docNumber || null,
        issuedAt: issuedAt || null,
        expiresAt: expiresAt || null,
      },
    });
  };

  const renderViewerModal = () => (
    <Modal
      visible={isViewerOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsViewerOpen(false)}
    >
      <View className="flex-1 justify-between" style={{ backgroundColor: 'rgba(0, 0, 0, 0.96)' }}>
        {/* Header */}
        <View
          className="pt-14 pb-4 px-5 flex-row items-center justify-between border-b"
          style={{ borderBottomColor: 'rgba(44, 44, 46, 0.8)', backgroundColor: 'rgba(10, 10, 12, 0.95)' }}
        >
          <View className="flex-1 pr-3">
            <Text className="text-platinum font-montserrat-semibold text-base" numberOfLines={1}>
              {label}
            </Text>
            <Text className="text-ash font-montserrat text-xs mt-0.5">
              Vista previa del documento cargado
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsViewerOpen(false)}
            className="w-10 h-10 rounded-full bg-charcoal items-center justify-center"
            accessibilityLabel="Cerrar vista previa"
          >
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Central image */}
        <View className="flex-1 items-center justify-center p-4">
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <ActivityIndicator size="large" color={THEME_COLORS.gold} />
          )}
        </View>

        {/* Footer */}
        <View
          className="pb-8 pt-3 px-5 border-t flex-row items-center justify-between"
          style={{ borderTopColor: 'rgba(44, 44, 46, 0.8)', backgroundColor: 'rgba(10, 10, 12, 0.95)' }}
        >
          <Text className="text-ash font-montserrat text-xs">
            {docNumber ? `N° ${docNumber}` : 'TransferBlack Conductor'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsViewerOpen(false)}
            className="bg-gold px-4 py-2 rounded-xl"
          >
            <Text className="text-obsidian font-montserrat-semibold text-xs">Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (!isExpanded && isUploaded) {
    return (
      <>
        <View
          className="p-3.5 mb-3 rounded-2xl border flex-row items-center justify-between"
          style={{
            backgroundColor: isMetadataMissing ? 'rgba(69, 26, 3, 0.4)' : 'rgba(44, 44, 46, 0.85)',
            borderColor: isMetadataMissing ? 'rgba(245, 158, 11, 0.6)' : 'rgba(52, 211, 153, 0.35)',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleExpand}
            className="flex-row items-center flex-1 mr-2"
          >
            {/* Thumbnail Preview o Icono */}
            {isImage && previewUri ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsViewerOpen(true)}
                className="w-12 h-12 rounded-xl bg-obsidian border mr-3 overflow-hidden items-center justify-center relative"
                style={{ borderColor: isMetadataMissing ? 'rgba(245, 158, 11, 0.6)' : 'rgba(52, 211, 153, 0.5)' }}
              >
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={200}
                />
                <View className="absolute bottom-0 right-0 bg-emerald-500 rounded-tl-md px-1 py-0.5">
                  <Ionicons name="checkmark" size={10} color="#000" />
                </View>
              </TouchableOpacity>
            ) : isPdf ? (
              <View
                className="w-12 h-12 rounded-xl border mr-3 items-center justify-center relative"
                style={{ backgroundColor: 'rgba(69, 26, 3, 0.4)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              >
                <Ionicons name="document-text" size={22} color="#F59E0B" />
                <View className="absolute bottom-0 right-0 bg-emerald-500 rounded-tl-md px-1 py-0.5">
                  <Ionicons name="checkmark" size={10} color="#000" />
                </View>
              </View>
            ) : (
              <View
                className="w-9 h-9 rounded-full border items-center justify-center mr-3"
                style={{ backgroundColor: 'rgba(6, 78, 59, 0.7)', borderColor: 'rgba(52, 211, 153, 0.4)' }}
              >
                <Ionicons name="checkmark" size={18} color="#34D399" />
              </View>
            )}

            <View className="flex-1 pr-1">
              <Text className="text-platinum font-montserrat-semibold text-sm" numberOfLines={1}>
                {label}
              </Text>
              {isMetadataMissing ? (
                <Text className="text-amber-400 font-montserrat-medium text-xs mt-0.5">
                  ⚠️ Faltan fechas de vigencia
                </Text>
              ) : docNumber || expiresAt ? (
                <Text className="text-ash font-montserrat text-xs mt-0.5" numberOfLines={1}>
                  {docNumber ? `N° ${docNumber}` : ''}
                  {docNumber && expiresAt ? ' • ' : ''}
                  {expiresAt ? `Vence: ${expiresAt}` : ''}
                </Text>
              ) : (
                <Text className="text-emerald-400 font-montserrat text-xs mt-0.5">
                  Documento cargado con éxito
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-1.5">
            {isImage && previewUri && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsViewerOpen(true)}
                className="p-2 rounded-lg bg-obsidian border border-charcoal"
                accessibilityLabel="Ver foto completa"
              >
                <Ionicons name="eye-outline" size={16} color={THEME_COLORS.gold} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDelete}
              disabled={deleteDocument.isPending}
              className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
              style={{ backgroundColor: 'rgba(69, 10, 10, 0.4)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              {deleteDocument.isPending ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text className="text-xs font-montserrat-medium text-red-400">Borrar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {renderViewerModal()}

        <DocumentScannerModal
          visible={isScannerOpen}
          docType={type}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onClose={() => setIsScannerOpen(false)}
          onPhotoCaptured={(uri, mimeType) => handleUpload(uri, mimeType)}
          onPickFromGallery={() => {
            setIsScannerOpen(false);
            setTimeout(() => handlePickImage(false), 400);
          }}
        />
      </>
    );
  }

  return (
    <View
      className="p-4 mb-4 rounded-2xl border bg-charcoal"
      style={{
        borderColor: isUploaded ? 'rgba(212, 175, 55, 0.4)' : '#2C2C2E',
        backgroundColor: isUploaded ? 'rgba(44, 44, 46, 0.95)' : '#2C2C2E',
      }}
    >
      {/* Header card with status badge and collapse button if uploaded */}
      <TouchableOpacity
        activeOpacity={isUploaded ? 0.7 : 1}
        onPress={isUploaded ? toggleExpand : undefined}
        className="flex-row items-start justify-between mb-3"
      >
        <View className="flex-1 pr-3">
          <Text className="text-platinum font-montserrat-semibold text-base leading-5">
            {label}
          </Text>
          <Text className="text-gold font-montserrat text-xs mt-1">
            * Requiere fechas de emisión y vencimiento
          </Text>
        </View>

        {/* Status Badge */}
        <View className="flex-row items-center gap-2">
          {isUploading ? (
            <View
              className="flex-row items-center px-2.5 py-1 rounded-full border"
              style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', borderColor: 'rgba(212, 175, 55, 0.3)' }}
            >
              <ActivityIndicator size="small" color={THEME_COLORS.gold} style={{ marginRight: 4 }} />
              <Text className="text-gold font-montserrat-medium text-xs">Subiendo</Text>
            </View>
          ) : isUploaded ? (
            <View
              className="flex-row items-center px-2.5 py-1 rounded-full border"
              style={{ backgroundColor: 'rgba(6, 78, 59, 0.6)', borderColor: 'rgba(52, 211, 153, 0.4)' }}
            >
              <Ionicons name="checkmark-circle" size={14} color="#34D399" style={{ marginRight: 4 }} />
              <Text className="text-emerald-400 font-montserrat-medium text-xs">Subido</Text>
            </View>
          ) : (
            <View className="flex-row items-center bg-obsidian border border-charcoal px-2.5 py-1 rounded-full">
              <Ionicons name="time-outline" size={14} color={THEME_COLORS.ash} style={{ marginRight: 4 }} />
              <Text className="text-ash font-montserrat-medium text-xs">Pendiente</Text>
            </View>
          )}

          {isUploaded && (
            <View className="p-1 rounded-full bg-obsidian border border-charcoal">
              <Ionicons name="chevron-up" size={16} color={THEME_COLORS.gold} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Preview Card si ya hay archivo cargado */}
      {previewUri && (
        <View className="mb-3 rounded-xl overflow-hidden border border-charcoal bg-obsidian">
          {isImage ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setIsViewerOpen(true)}
              className="relative w-full h-44 bg-black items-center justify-center"
            >
              <Image
                source={{ uri: previewUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
              />
              <View
                className="absolute bottom-2 right-2 flex-row items-center px-3 py-1.5 rounded-full border"
                style={{ backgroundColor: 'rgba(10, 10, 12, 0.85)', borderColor: 'rgba(212, 175, 55, 0.4)' }}
              >
                <Ionicons name="eye-outline" size={14} color={THEME_COLORS.gold} />
                <Text className="text-gold font-montserrat-medium text-xs ml-1.5">
                  Ver foto completa
                </Text>
              </View>
              <View
                className="absolute top-2 left-2 px-2.5 py-1 rounded-md flex-row items-center border"
                style={{ backgroundColor: 'rgba(10, 10, 12, 0.85)', borderColor: 'rgba(52, 211, 153, 0.4)' }}
              >
                <Ionicons name="checkmark-circle" size={13} color="#34D399" />
                <Text className="text-emerald-400 font-montserrat-medium text-[11px] ml-1">
                  {isUploaded ? 'Documento verificado' : 'Vista previa local'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : isPdf ? (
            <View className="p-3.5 flex-row items-center">
              <View
                className="w-11 h-11 rounded-lg border items-center justify-center mr-3"
                style={{ backgroundColor: 'rgba(69, 26, 3, 0.5)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              >
                <Ionicons name="document-text" size={24} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-platinum font-montserrat-medium text-xs">
                  Documento PDF cargado
                </Text>
                <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                  Archivo listo para verificación
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {/* Action Buttons */}
      <View className="flex-row gap-3 mb-4">
        <TouchableOpacity
          onPress={() => {
            if (!issuedAt || !expiresAt) {
              Alert.alert('Faltan datos', 'Por favor ingresá la fecha de emisión y vencimiento antes de cargar el documento.');
              return;
            }
            setIsScannerOpen(true);
          }}
          activeOpacity={0.8}
          className="flex-1 flex-row items-center justify-center rounded-xl py-3"
          style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)' }}
        >
          <Ionicons name="camera-outline" size={18} color={THEME_COLORS.gold} />
          <Text className="text-gold font-montserrat-bold text-sm ml-2">
            {isUploaded ? 'Reemplazar Foto' : 'Tomar Foto'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (!issuedAt || !expiresAt) {
              Alert.alert('Faltan datos', 'Por favor ingresá la fecha de emisión y vencimiento antes de cargar el documento.');
              return;
            }
            handlePickDocument();
          }}
          activeOpacity={0.8}
          className="flex-row items-center justify-center bg-obsidian border border-charcoal rounded-xl px-5"
        >
          <Ionicons name="document-text-outline" size={18} color={THEME_COLORS.platinum} />
          <Text className="text-platinum font-montserrat-semibold text-sm ml-2">PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Metadata Inputs (Required for all) */}
      <View
        className="rounded-xl p-3 gap-2 border"
        style={{ backgroundColor: 'rgba(10, 10, 12, 0.8)', borderColor: 'rgba(44, 44, 46, 0.9)' }}
      >
        <Text className="text-ash font-montserrat text-xs uppercase tracking-wider mb-1">
          Fechas y Datos del Documento
        </Text>
        <TextInput
          placeholder="Número de trámite / documento"
          placeholderTextColor={THEME_COLORS.ash}
          value={docNumber}
          onChangeText={(val) => {
            setDocNumber(val);
            setDocumentState(type, {
              metadata: {
                documentNumber: val || null,
                issuedAt: issuedAt || null,
                expiresAt: expiresAt || null,
              },
            });
          }}
          onBlur={updateMetadata}
          className="h-10 bg-charcoal text-white font-montserrat text-xs px-3 rounded-lg border border-charcoal"
        />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <DatePickerInput
              placeholder="Emisión"
              value={issuedAt}
              containerClassName="mb-0"
              minYear={2015}
              maxYear={new Date().getFullYear()}
              title="Fecha de Emisión"
              onChangeDate={(d) => {
                setIssuedAt(d);
                setDocumentState(type, {
                  metadata: {
                    documentNumber: docNumber || null,
                    issuedAt: d || null,
                    expiresAt: expiresAt || null,
                  },
                });
              }}
            />
          </View>
          <View className="flex-1">
            <DatePickerInput
              placeholder="Vencimiento"
              value={expiresAt}
              containerClassName="mb-0"
              minYear={new Date().getFullYear()}
              maxYear={new Date().getFullYear() + 15}
              title="Fecha de Vencimiento"
              onChangeDate={(d) => {
                setExpiresAt(d);
                setDocumentState(type, {
                  metadata: {
                    documentNumber: docNumber || null,
                    issuedAt: issuedAt || null,
                    expiresAt: d || null,
                  },
                });
              }}
            />
          </View>
        </View>
      </View>

      {/* Footer controls when uploaded */}
      {isUploaded && (
        <View
          className="flex-row items-center justify-between mt-3 pt-3 border-t"
          style={{ borderTopColor: 'rgba(44, 44, 46, 0.7)' }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleExpand}
            className="flex-row items-center"
          >
            <Ionicons name="chevron-up" size={16} color={THEME_COLORS.gold} />
            <Text className="text-gold font-montserrat-medium text-xs ml-1">Minimizar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDelete}
            disabled={deleteDocument.isPending}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg border"
            style={{ backgroundColor: 'rgba(69, 10, 10, 0.4)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            {deleteDocument.isPending ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                <Text className="text-xs font-montserrat-medium text-red-400">Borrar documento</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {renderViewerModal()}

      {/* VIP Scanner Modal */}
      <DocumentScannerModal
        visible={isScannerOpen}
        docType={type}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onClose={() => setIsScannerOpen(false)}
        onPhotoCaptured={(uri, mimeType) => handleUpload(uri, mimeType)}
        onPickFromGallery={() => {
          setIsScannerOpen(false);
          setTimeout(() => handlePickImage(false), 400);
        }}
      />
    </View>
  );
};

