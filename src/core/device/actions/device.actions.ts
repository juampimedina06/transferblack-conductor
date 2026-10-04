import { transferApi } from '@/core/api/transferApi';
import { RegisterDeviceDto, RegisterDeviceResponse, DeviceResponse } from '../interface/device.interface';

/**
 * Registra el dispositivo en el backend para recibir notificaciones push
 * POST /api/v1/devices
 */
export async function registerDevice(dto: RegisterDeviceDto): Promise<DeviceResponse> {
  const response = await transferApi.post<RegisterDeviceResponse>('/devices', dto);
  return response.data.data;
}
