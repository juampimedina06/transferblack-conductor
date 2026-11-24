import { transferApi } from '@/core/api/transferApi';
import {
  DriverMeStatus,
  DriverDocumentItem,
} from '../interface/driverStatus.interface';

/**
 * Obtiene el estado operativo, contador de cancelaciones, cooldown y compliance documental.
 * GET /api/v1/driver/me/status
 */
export async function getDriverStatus(): Promise<DriverMeStatus> {
  const response = await transferApi.get<DriverMeStatus | { data: DriverMeStatus }>(
    '/driver/me/status'
  );
  const data = response.data;
  if ('data' in data && data.data) {
    return data.data;
  }
  return data as DriverMeStatus;
}

/**
 * Obtiene el listado de documentos del chofer con sus estados de vigencia.
 * GET /api/v1/driver/me/documents
 */
export async function getDriverDocuments(): Promise<DriverDocumentItem[]> {
  const response = await transferApi.get<
    any
  >('/driver/me/documents');
  const data = response.data;
  const rawList: any[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];

  return rawList.map((item) => ({
    id: String(item.id || ''),
    type: item.type || item.documentType,
    documentType: item.documentType || item.type || '',
    status: item.status,
    issuedAt: item.issuedAt || null,
    expiresAt: item.expiresAt || null,
    graceUntil: item.graceUntil ?? null,
    daysRemaining: item.daysRemaining ?? item.daysUntilExpiry ?? null,
    daysUntilExpiry: item.daysUntilExpiry ?? item.daysRemaining ?? null,
    rejectionReason: item.rejectionReason || null,
  }));
}

/**
 * Sincroniza explícitamente la disponibilidad operativa del conductor en el backend
 * (`online` | `offline`) para que el despacho de reservas y el mapa en vivo del panel
 * reflejen el cambio de estado de inmediato sin depender del timeout del socket.
 */
export async function updateDriverAvailability(
  status: 'online' | 'offline'
): Promise<void> {
  await transferApi.put('/driver/me/availability', {
    status,
    availabilityStatus: status,
  });
}

/**
 * Resuelve de forma segura el ID del vehículo aprobado/activo del conductor desde `GET /driver/me`.
 */
export async function getActiveDriverVehicleId(): Promise<string | null> {
  try {
    const res = await transferApi.get('/driver/me');
    const body = res.data;
    const candidate =
      body?.data?.vehicle?.id ??
      body?.vehicle?.id ??
      body?.data?.driverProfile?.vehicles?.[0]?.id ??
      body?.driverProfile?.vehicles?.[0]?.id ??
      body?.data?.vehicles?.[0]?.id ??
      body?.vehicles?.[0]?.id ??
      body?.data?.vehicleId ??
      body?.vehicleId ??
      null;
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
  } catch {
    return null;
  }
}
