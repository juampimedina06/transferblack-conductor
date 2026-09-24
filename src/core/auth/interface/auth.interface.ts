export type UserRole = 'passenger' | 'driver' | 'admin';
export type ProfileStatus = 'active' | 'blocked' | 'deleted';
export type Gender = 'MASCULINO' | 'FEMENINOO' | 'OTRO';
export type DocumentType = 'DNI' | 'CUIL';

export interface UserProfile {
  id: string;
  email: string;
  email_verified_at: string | null;
  status: ProfileStatus;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  age: number | null;
  gender: Gender | string | null;
  document_type: DocumentType | string | null;
  document_number: string | null;
  address_text: string | null;
  roles: UserRole[];
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_at: string;
}

export interface AuthResponse {
  data: {
    profile: UserProfile;
    tokens: AuthTokens;
  };
}

export interface UserProfileResponse {
  data: UserProfile;
}

export interface ApiErrorDetail {
  attempts_remaining?: number;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  details?: ApiErrorDetail;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export class AuthError extends Error {
  status?: number;
  code?: string;
  details?: ApiErrorDetail;

  constructor(message: string, status?: number, code?: string, details?: ApiErrorDetail) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
