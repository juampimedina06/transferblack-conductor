export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedAvatarMimeType = (typeof ALLOWED_AVATAR_MIME_TYPES)[number];

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface AvatarUploadUrlResponse {
  key: string;
  upload_url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expires_in: number;
  expires_at: string;
  max_bytes: number;
}

export interface AvatarReadUrlResponse {
  avatar_url: string | null;
  expires_at: string | null;
  expires_in: number | null;
}

export interface AvatarFileInput {
  fileUri: string;
  mimeType?: string | null;
  fileSize?: number;
}

export class AvatarError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'AvatarError';
    this.status = status;
    this.code = code;
  }
}
