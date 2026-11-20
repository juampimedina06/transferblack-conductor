import { isAxiosError } from 'axios';

import { transferApi } from '@/core/api/transferApi';
import type {
  ApiErrorResponse,
  UserProfileResponse,
} from '@/core/auth/interface/auth.interface';
import {
  ALLOWED_AVATAR_MIME_TYPES,
  AvatarError,
  MAX_AVATAR_SIZE_BYTES,
  type AllowedAvatarMimeType,
  type AvatarFileInput,
  type AvatarReadUrlResponse,
  type AvatarUploadUrlResponse,
} from '../interface/avatar.interface';

const EXTENSION_TO_MIME: Record<string, AllowedAvatarMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function handleAvatarApiError(error: unknown, fallbackMessage: string): never {
  if (error instanceof AvatarError) {
    throw error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    throw new AvatarError('Subida cancelada por el usuario.', undefined, 'UPLOAD_CANCELLED');
  }

  if (isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status;
    const apiError = error.response?.data?.error;
    if (apiError?.message) {
      throw new AvatarError(apiError.message, status, apiError.code);
    }
    if (!error.response) {
      throw new AvatarError(
        'No hay conexión con el servidor. Verificá tu internet e intentá nuevamente.',
        undefined,
        'NETWORK_ERROR',
      );
    }
  }

  if (error instanceof Error) {
    throw new AvatarError(error.message);
  }

  throw new AvatarError(fallbackMessage);
}

/**
 * Normalizes and validates the MIME type of a selected profile photo against allowed formats.
 */
export function resolveAvatarMimeType(
  mimeType?: string | null,
  fileUri?: string,
): AllowedAvatarMimeType | null {
  if (mimeType) {
    const normalized = mimeType.split(';')[0].trim().toLowerCase();
    const mapped =
      normalized === 'image/jpg' || normalized === 'image/pjpeg'
        ? 'image/jpeg'
        : normalized;

    if (ALLOWED_AVATAR_MIME_TYPES.includes(mapped as AllowedAvatarMimeType)) {
      return mapped as AllowedAvatarMimeType;
    }
  }

  if (fileUri && !mimeType) {
    const cleanUri = fileUri.split('?')[0].split('#')[0];
    const ext = cleanUri.split('.').pop()?.toLowerCase() ?? '';
    return EXTENSION_TO_MIME[ext] ?? null;
  }

  return null;
}

/**
 * Requests a short-lived S3 presigned PUT URL from the backend for the authenticated user.
 */
export async function requestAvatarUploadUrl(
  contentType: AllowedAvatarMimeType,
  contentLength?: number,
): Promise<AvatarUploadUrlResponse> {
  try {
    const payload =
      contentLength !== undefined
        ? { content_type: contentType, content_length: contentLength }
        : { content_type: contentType };

    const { data } = await transferApi.post<{ data: AvatarUploadUrlResponse }>(
      '/users/me/avatar/upload-url',
      payload,
    );
    return data.data;
  } catch (error: unknown) {
    return handleAvatarApiError(error, 'No se pudo autorizar la subida de la foto de perfil.');
  }
}

/**
 * Uploads the local image directly to S3 via a presigned PUT URL with strict Content-Type and size check.
 */
export async function uploadFileToPresignedUrl(
  uploadUrl: string,
  fileUri: string,
  contentType: AllowedAvatarMimeType,
  signal?: AbortSignal,
): Promise<void> {
  let blob: Blob;
  try {
    const localResponse = await fetch(fileUri);
    blob = await localResponse.blob();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AvatarError('Subida cancelada por el usuario.', undefined, 'UPLOAD_CANCELLED');
    }
    throw new AvatarError(
      'No se pudo leer la imagen seleccionada del dispositivo.',
      undefined,
      'LOCAL_READ_ERROR',
    );
  }

  if (blob.size <= 0) {
    throw new AvatarError(
      'La imagen seleccionada está vacía o dañada.',
      400,
      'INVALID_FILE_SIZE',
    );
  }

  if (blob.size > MAX_AVATAR_SIZE_BYTES) {
    throw new AvatarError(
      'La imagen supera el tamaño máximo permitido de 5 MB.',
      413,
      'FILE_TOO_LARGE',
    );
  }

  let s3Response: Response;
  try {
    s3Response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
      signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AvatarError('Subida cancelada por el usuario.', undefined, 'UPLOAD_CANCELLED');
    }
    throw new AvatarError(
      'Error de red al subir la imagen. Verificá tu conexión e intentá nuevamente.',
      undefined,
      'NETWORK_ERROR',
    );
  }

  if (!s3Response.ok) {
    throw new AvatarError(
      'El almacenamiento rechazó la subida de la imagen. Intentá nuevamente.',
      s3Response.status,
      'S3_UPLOAD_FAILED',
    );
  }
}

/**
 * Confirms the S3 upload with the backend so it verifies the object and updates PostgreSQL.
 */
export async function confirmAvatarUpload(key: string): Promise<UserProfileResponse> {
  try {
    const { data } = await transferApi.post<UserProfileResponse>('/users/me/avatar/confirm', {
      key,
    });
    return data;
  } catch (error: unknown) {
    return handleAvatarApiError(error, 'No se pudo confirmar la foto de perfil en el servidor.');
  }
}

/**
 * Requests a fresh temporary presigned GET URL for displaying the driver's private avatar.
 */
export async function getAvatarReadUrl(): Promise<AvatarReadUrlResponse> {
  try {
    const { data } = await transferApi.get<{ data: AvatarReadUrlResponse }>('/users/me/avatar');
    return data.data;
  } catch (error: unknown) {
    return handleAvatarApiError(error, 'No se pudo renovar el enlace de la foto de perfil.');
  }
}

/**
 * Removes the current profile photo reference in PostgreSQL and deletes the object from S3.
 */
export async function deleteProfileAvatar(): Promise<UserProfileResponse> {
  try {
    const { data } = await transferApi.delete<UserProfileResponse>('/users/me/avatar');
    return data;
  } catch (error: unknown) {
    return handleAvatarApiError(error, 'No se pudo eliminar la foto de perfil.');
  }
}

/**
 * Orchestrates the full profile photo upload pipeline: validate -> presign -> PUT S3 -> confirm.
 */
export async function uploadProfileAvatar(
  input: AvatarFileInput,
  signal?: AbortSignal,
): Promise<UserProfileResponse> {
  const contentType = resolveAvatarMimeType(input.mimeType, input.fileUri);
  if (!contentType) {
    throw new AvatarError(
      'Formato no permitido. Solo se aceptan imágenes JPG, PNG o WebP.',
      400,
      'INVALID_FILE_TYPE',
    );
  }

  if (input.fileSize !== undefined) {
    if (input.fileSize <= 0) {
      throw new AvatarError(
        'La imagen seleccionada no tiene un tamaño válido.',
        400,
        'INVALID_FILE_SIZE',
      );
    }
    if (input.fileSize > MAX_AVATAR_SIZE_BYTES) {
      throw new AvatarError(
        'La imagen supera el tamaño máximo permitido de 5 MB.',
        413,
        'FILE_TOO_LARGE',
      );
    }
  }

  if (signal?.aborted) {
    throw new AvatarError('Subida cancelada por el usuario.', undefined, 'UPLOAD_CANCELLED');
  }

  const presigned = await requestAvatarUploadUrl(contentType, input.fileSize);

  if (signal?.aborted) {
    throw new AvatarError('Subida cancelada por el usuario.', undefined, 'UPLOAD_CANCELLED');
  }

  await uploadFileToPresignedUrl(presigned.upload_url, input.fileUri, contentType, signal);

  if (signal?.aborted) {
    throw new AvatarError('Subida cancelada por el usuario.', undefined, 'UPLOAD_CANCELLED');
  }

  return confirmAvatarUpload(presigned.key);
}
