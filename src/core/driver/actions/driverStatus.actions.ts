import { transferApi } from '@/core/api/transferApi';
import {
  DriverMeStatus,
  DriverDocumentItem,
} from '../interface/driverStatus.interface';

/**
 * Obtiene el estado operativo, contador de cancelaciones, cooldown y compliance documental.
 * GET /api/v1/drivers/me/status
 */
export async function getDriverStatus(): Promise<DriverMeStatus> {
  const response = await transferApi.get<DriverMeStatus | { data: DriverMeStatus }>(
    '/drivers/me/status'
  );
  const data = response.data;
  if ('data' in data && data.data) {
    return data.data;
  }
  return data as DriverMeStatus;
}

/**
 * Obtiene el listado de documentos del chofer con sus estados de vigencia.
 * GET /api/v1/drivers/me/documents
 */
export async function getDriverDocuments(): Promise<DriverDocumentItem[]> {
  const response = await transferApi.get<
    DriverDocumentItem[] | { data: DriverDocumentItem[] }
  >('/drivers/me/documents');
  const data = response.data;
  if ('data' in data && Array.isArray(data.data)) {
    return data.data;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}
