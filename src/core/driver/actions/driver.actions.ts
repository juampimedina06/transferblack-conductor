import { transferApi } from '@/core/api/transferApi';
import {
  DriverMeData,
  DriverMeResponse,
  DeleteDriverAccountDto,
  DeleteDriverAccountResponse,
} from '../interface/driver.interface';

/**
 * Obtiene el perfil operativo del conductor y su vehículo activo
 * desde el endpoint GET /api/v1/driver/me
 */
export async function getDriverMe(): Promise<DriverMeData> {
  const response = await transferApi.get<DriverMeResponse>('/driver/me');
  return response.data.data;
}

/**
 * Elimina la cuenta del conductor de forma permanente y anonimizada
 * desde el endpoint DELETE /api/v1/driver/me
 */
export async function deleteDriverAccount(
  dto: DeleteDriverAccountDto
): Promise<DeleteDriverAccountResponse> {
  const response = await transferApi.delete<DeleteDriverAccountResponse>('/driver/me', {
    data: dto,
  });
  return response.data;
}
