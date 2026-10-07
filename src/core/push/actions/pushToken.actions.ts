import { transferApi } from '@/core/api/transferApi';
import {
  RegisterPushTokenDto,
  registerPushTokenSchema,
  RegisterPushTokenResponse,
} from '../interface/pushToken.interface';

/**
 * Registra o actualiza el push token nativo (FCM) del conductor en el backend.
 * PUT /api/v1/driver/me/push-token
 */
export async function registerDriverPushToken(
  dto: RegisterPushTokenDto
): Promise<RegisterPushTokenResponse> {
  const validated = registerPushTokenSchema.parse(dto);
  const response = await transferApi.put<RegisterPushTokenResponse>(
    '/driver/me/push-token',
    validated
  );
  return response.data;
}

/**
 * Revoca el push token del conductor al cerrar sesión.
 * DELETE /api/v1/driver/me/push-token
 */
export async function revokeDriverPushToken(
  token?: string
): Promise<{ success: boolean; message?: string }> {
  const response = await transferApi.delete<{ success: boolean; message?: string }>(
    '/driver/me/push-token',
    {
      data: token ? { token } : undefined,
    }
  );
  return response.data;
}
