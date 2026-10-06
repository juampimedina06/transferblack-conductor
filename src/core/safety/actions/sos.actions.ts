import { transferApi } from '@/core/api/transferApi';
import { SosRequestPayload, SosResponse } from '../interface/sos.interface';

/**
 * Registra una alerta de emergencia SOS asociada al viaje activo.
 * POST /api/v1/rides/:tripId/sos
 * Idempotente por clientEventId.
 */
export async function sendSosAlert(
  tripId: string,
  payload: SosRequestPayload
): Promise<SosResponse> {
  const response = await transferApi.post<SosResponse | { data: SosResponse }>(
    `/rides/${tripId}/sos`,
    payload
  );
  const data = response.data;
  if ('data' in data && data.data) {
    return data.data;
  }
  return data as SosResponse;
}
