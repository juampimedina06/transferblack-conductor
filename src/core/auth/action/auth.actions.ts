import axios from 'axios';
import { transferApi } from '../../api/transferApi';
import {
  ApiErrorResponse,
  AuthError,
  AuthResponse,
  UserProfileResponse,
} from '../interface/auth.interface';

const handleApiError = (error: unknown, fallbackMessage: string): never => {
  if (error instanceof AuthError) {
    throw error;
  }
  if (axios.isAxiosError<ApiErrorResponse>(error) && error.response?.data?.error) {
    const apiError = error.response.data.error;
    throw new AuthError(
      apiError.message || fallbackMessage,
      error.response.status,
      apiError.code,
      apiError.details
    );
  }
  if (error instanceof Error) {
    throw new AuthError(error.message);
  }
  throw new AuthError(fallbackMessage);
};

export const authActions = {
  async register(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data } = await transferApi.post<AuthResponse>('/auth/register', { email, password });
      return data;
    } catch (error: unknown) {
      return handleApiError(error, 'Error al registrarse. Intente nuevamente.');
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data } = await transferApi.post<AuthResponse>('/auth/login', { email, password });
      return data;
    } catch (error: unknown) {
      return handleApiError(error, 'Error al iniciar sesión. Verifique sus credenciales.');
    }
  },

  async updateProfile(profileData: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  }): Promise<UserProfileResponse> {
    try {
      const { data } = await transferApi.patch<UserProfileResponse>('/users/me', profileData);
      return data;
    } catch (error: unknown) {
      return handleApiError(error, 'Error al actualizar el perfil.');
    }
  },

  async verifyEmail(token: string): Promise<void> {
    try {
      await transferApi.post('/auth/verify-email', { token });
    } catch (error: unknown) {
      return handleApiError(error, 'Error al verificar el correo.');
    }
  },

  async resendVerification(): Promise<void> {
    try {
      await transferApi.post('/auth/resend-verification');
    } catch (error: unknown) {
      return handleApiError(error, 'Error al reenviar el PIN.');
    }
  },
};
