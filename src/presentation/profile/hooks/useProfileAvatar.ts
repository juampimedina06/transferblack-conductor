import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {
  deleteProfileAvatar,
  getAvatarReadUrl,
  uploadProfileAvatar,
} from '@/core/user/actions/avatar.actions';
import { AvatarError } from '@/core/user/interface/avatar.interface';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { showBannerNotification } from '@/presentation/notifications/store/useBannerNotificationStore';

export type AvatarImageSource = 'camera' | 'library';

export interface UseProfileAvatarResult {
  isUploading: boolean;
  isDeleting: boolean;
  pickAndUploadAvatar: (source: AvatarImageSource) => Promise<void>;
  removeAvatar: () => Promise<void>;
  refreshAvatarUrl: () => Promise<void>;
  cancelUpload: () => void;
}

async function ensureImagePermission(source: AvatarImageSource): Promise<boolean> {
  if (source === 'camera') {
    const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
    if (status === 'granted') {
      return true;
    }

    if (!canAskAgain) {
      Alert.alert(
        'Permiso de cámara requerido',
        'Para tomar tu foto de perfil, TransferBlack necesita acceso a la cámara.\n\nPodés habilitarlo desde los Ajustes del sistema.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
        ],
      );
      return false;
    }

    const requested = await ImagePicker.requestCameraPermissionsAsync();
    if (!requested.granted) {
      Alert.alert(
        'Permiso de cámara no concedido',
        'No se pudo acceder a la cámara para tomar tu foto de perfil.\n\nPodés habilitarlo desde Ajustes cuando quieras.',
        [
          { text: 'Entendido', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
        ],
      );
      return false;
    }

    return true;
  }

  const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (status === 'granted') {
    return true;
  }

  if (!canAskAgain) {
    Alert.alert(
      'Permiso de galería requerido',
      'Para elegir una foto de perfil, TransferBlack necesita acceso a tus fotos.\n\nPodés habilitarlo desde los Ajustes del sistema.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
      ],
    );
    return false;
  }

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!requested.granted) {
    Alert.alert(
      'Permiso de galería no concedido',
      'No se pudo acceder a tu galería para seleccionar una foto de perfil.\n\nPodés habilitarlo desde Ajustes cuando quieras.',
      [
        { text: 'Entendido', style: 'cancel' },
        { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
      ],
    );
    return false;
  }

  return true;
}

/**
 * Manages profile photo selection, direct S3 upload with cancellation and concurrency guard,
 * deletion, and temporary read URL refresh for the driver app.
 */
export function useProfileAvatar(): UseProfileAvatarResult {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isBusyRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const pickAndUploadAvatar = useCallback(async (source: AvatarImageSource): Promise<void> => {
    if (isBusyRef.current) {
      return;
    }

    const hasPermission = await ensureImagePermission(source);
    if (!hasPermission) {
      return;
    }

    let pickerResult: ImagePicker.ImagePickerResult;
    try {
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      };

      pickerResult =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    } catch {
      Alert.alert(
        'Error al seleccionar imagen',
        'No se pudo abrir el selector de imágenes. Intentá nuevamente.',
      );
      return;
    }

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return;
    }

    const asset = pickerResult.assets[0];
    if (!asset?.uri) {
      return;
    }

    isBusyRef.current = true;
    setIsUploading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const updatedUser = await uploadProfileAvatar(
        {
          fileUri: asset.uri,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
        },
        controller.signal,
      );

      useAuthStore.getState().updateUser(updatedUser);
      showBannerNotification({
        type: 'success',
        title: 'Foto de perfil actualizada',
        message: 'Tu nueva imagen ya está visible en tu perfil.',
      });
    } catch (error: unknown) {
      if (error instanceof AvatarError && error.code === 'UPLOAD_CANCELLED') {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar tu foto de perfil. Intentá nuevamente.';
      showBannerNotification({
        type: 'error',
        title: 'No se pudo actualizar la foto',
        message,
      });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      isBusyRef.current = false;
      setIsUploading(false);
    }
  }, []);

  const removeAvatar = useCallback(async (): Promise<void> => {
    if (isBusyRef.current) {
      return;
    }

    isBusyRef.current = true;
    setIsDeleting(true);

    try {
      const updatedUser = await deleteProfileAvatar();
      useAuthStore.getState().updateUser(updatedUser);
      showBannerNotification({
        type: 'info',
        title: 'Foto de perfil eliminada',
        message: 'Podés subir una nueva foto cuando quieras.',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar tu foto de perfil. Intentá nuevamente.';
      showBannerNotification({
        type: 'error',
        title: 'No se pudo eliminar la foto',
        message,
      });
    } finally {
      isBusyRef.current = false;
      setIsDeleting(false);
    }
  }, []);

  const refreshAvatarUrl = useCallback(async (): Promise<void> => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const request = (async () => {
      try {
        const data = await getAvatarReadUrl();
        useAuthStore.getState().updateAvatarUrl(data.avatar_url, data.expires_at);
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = request;
    return request;
  }, []);

  return {
    isUploading,
    isDeleting,
    pickAndUploadAvatar,
    removeAvatar,
    refreshAvatarUrl,
    cancelUpload,
  };
}
