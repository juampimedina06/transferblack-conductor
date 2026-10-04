import { transferApi } from '@/core/api/transferApi';
import { DriverMeData, DriverMeResponse } from '../interface/driver.interface';

/**
 * Obtiene el perfil operativo del conductor y su vehículo activo
 * desde el endpoint GET /api/v1/driver/me
 */
export async function getDriverMe(): Promise<DriverMeData> {
  const response = await transferApi.get<DriverMeResponse>('/driver/me');
  return response.data.data;
}
