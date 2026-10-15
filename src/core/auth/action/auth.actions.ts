import { isAxiosError } from 'axios';
import { transferApi } from '../../api/transferApi';
import {
  ApiErrorResponse,
  AuthError,
  AuthResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  ResetPasswordVerifyResponse,
  UserProfileResponse,
} from '../interface/auth.interface';

const handleApiError = (error: unknown, fallbackMessage: string): never => {
  if (error instanceof AuthError) {
    throw error;
  }
  if (isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status;
    const apiError = error.response?.data?.error;
    const rawRetryAfter =
      typeof error.response?.headers?.get === 'function'
        ? error.response.headers.get('retry-after')
        : error.response?.headers?.['retry-after'] ?? error.response?.headers?.['Retry-After'];
    const parsedHeader = rawRetryAfter ? parseInt(String(rawRetryAfter), 10) : NaN;
    const retryAfter =
      !isNaN(parsedHeader) && parsedHeader > 0
        ? parsedHeader
        : (error as any).retryAfterSeconds ??
          (apiError?.details?.retry_after_seconds as number | undefined) ??
          (status === 429 ? 60 : undefined);

    if (apiError) {
      throw new AuthError(
        apiError.message || fallbackMessage,
        status,
        apiError.code || (status === 429 ? 'RATE_LIMIT_EXCEEDED' : undefined),
        apiError.details,
        retryAfter
      );
    }

    if (status === 429) {
      throw new AuthError(
        `Demasiados intentos. Esperá ${retryAfter ?? 60} segundos antes de volver a intentar.`,
        429,
        'RATE_LIMIT_EXCEEDED',
        { retry_after_seconds: retryAfter ?? 60 },
        retryAfter ?? 60
      );
    }
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

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    try {
      const { data } = await transferApi.post<ForgotPasswordResponse>('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      return data;
    } catch (error: unknown) {
      return handleApiError(error, 'Error al solicitar el código de recuperación.');
    }
  },

  async verifyResetPasswordCode(email: string, code: string): Promise<ResetPasswordVerifyResponse> {
    try {
      const { data } = await transferApi.post<ResetPasswordVerifyResponse>('/auth/reset-password/verify', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      return data;
    } catch (error: unknown) {
      return handleApiError(error, 'Error al verificar el código de recuperación.');
    }
  },

  async resetPassword(resetToken: string, newPassword: string): Promise<ResetPasswordResponse> {
    try {
      const { data } = await transferApi.post<ResetPasswordResponse>('/auth/reset-password', {
        reset_token: resetToken,
        new_password: newPassword,
      });
      return data;
    } catch (error: unknown) {
      return handleApiError(error, 'Error al restablecer la contraseña.');
    }
  },

  async sendOtp(email: string): Promise<{ sent: boolean }> {
    try {
      const { data } = await transferApi.post<{ data: { sent: boolean } }>('/auth/send-otp', {
        email: email.trim().toLowerCase(),
      });
      return data.data;
    } catch (error: unknown) {
      return handleApiError(error, 'Error al solicitar el código de verificación.');
    }
  },
};
