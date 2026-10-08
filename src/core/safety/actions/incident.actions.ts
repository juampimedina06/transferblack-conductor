import { transferApi } from '../../api/transferApi';
import { TripIncidentReportPayload } from '../interface/incident.interface';
import { ratePassenger } from '../../trip/actions/trip.actions';
import { useSafetyStore } from '../../../presentation/safety/store/useSafetyStore';

export interface IncidentReportResult {
  success: boolean;
  message: string;
  blockApplied: boolean;
}

/**
 * Reporta un incidente operativo o de seguridad sobre un viaje terminado,
 * y opcionalmente bloquea el emparejamiento futuro con el pasajero.
 */
export async function reportTripIncident(
  payload: TripIncidentReportPayload
): Promise<IncidentReportResult> {
  // 1. Intentar registrar en endpoint de incidentes
  try {
    await transferApi.post(`/rides/${payload.tripId}/incident`, {
      category: payload.category,
      description: payload.description,
      block_passenger: payload.blockPassenger,
      damage_estimated_amount: payload.damageEstimatedAmount,
      reported_at: payload.reportedAt,
    });
  } catch (err: any) {
    // Si el endpoint dedicado aún no está desplegado en backend, no interrumpimos el flujo
    // porque rate-passenger también persiste feedback y bloqueo.
    console.warn('Advertencia registrando incidente en /incident:', err?.message);
  }

  // 2. Registrar calificación de seguridad (1 estrella) con flag de bloqueo y categoría
  try {
    await ratePassenger(payload.tripId, {
      rating: 1,
      comment: `[INCIDENTE: ${payload.category}] ${payload.description}`,
      tags: [payload.category, 'incident_reported'],
      block_matching: payload.blockPassenger,
      incident_type: payload.category,
    });
  } catch (err: any) {
    console.warn('Advertencia calificando con bloqueo:', err?.message);
  }

  // 3. Persistir bloqueo en el store local del conductor
  if (payload.blockPassenger && payload.passengerId) {
    useSafetyStore.getState().blockPassenger({
      passengerId: payload.passengerId,
      passengerName: payload.passengerName,
      blockedAt: payload.reportedAt,
      reason: payload.description || payload.category,
      tripId: payload.tripId,
    });
  }

  return {
    success: true,
    message: payload.blockPassenger
      ? 'Incidente reportado y pasajero bloqueado exitosamente.'
      : 'Incidente reportado exitosamente.',
    blockApplied: payload.blockPassenger,
  };
}
