import { transferApi } from '../../api/transferApi';
import { ApiErrorResponse } from '../../auth/interface/auth.interface';

import {
  AcceptOfferInput,
  AcceptOfferResponse,
  Trip,
  TripRequestError,
  ActiveTripSummary,
  ActiveTripResponse,
  DriverScheduledTrip,
  DriverScheduledTripsResponse,
} from '../interface/trip.interface';
export type {
  AcceptOfferInput,
  AcceptOfferResponse,
  Trip,
  ActiveTripSummary,
  ActiveTripResponse,
  DriverScheduledTrip,
  DriverScheduledTripsResponse,
};
export { TripRequestError };

/**
 * `POST /rides/:tripId/accept` responde 409 para ocho causas distintas. Antes
 * todas caían en un unico mensaje que decia que se habia perdido el viaje, y
 * el conductor persiguiendo un competidor inexistente. Cada codigo se traduce
 * a un mensaje que dice que paso y que hacer.
 */
const ACCEPT_CONFLICT_MESSAGES: Record<string, string> = {
  TRIP_NOT_DISPATCHABLE: 'Este viaje ya no está disponible: fue asignado, se canceló o dejó de buscar conductor.',
  OFFER_NOT_FOUND: 'La oferta de este viaje venció o ya no está activa. Quedate atento a la próxima.',
  DRIVER_NOT_APPROVED: 'Tu cuenta de conductor todavía no está aprobada.',
  DRIVER_NOT_AVAILABLE: 'No estás disponible en este momento. Conectate para volver a recibir ofertas.',
  DRIVER_CASH_RESTRICTED: 'Restricción de deuda: no podés aceptar viajes en efectivo.',
  VEHICLE_NOT_OWNED: 'El vehículo seleccionado no te pertenece.',
  VEHICLE_NOT_APPROVED: 'Tu vehículo todavía no está aprobado.',
  DRIVER_HAS_ACTIVE_TRIP: 'Ya tenés un viaje en curso. Terminalo antes de aceptar otro.',
};

const ACCEPT_CONFLICT_FALLBACK = 'No se pudo aceptar el viaje porque cambió de estado. Probá con otra oferta.';

export const acceptTripOffer = async (tripId: string, data: AcceptOfferInput): Promise<AcceptOfferResponse> => {
  try {
    const response = await transferApi.post<AcceptOfferResponse>(`/rides/${tripId}/accept`, data);
    return response.data;
  } catch (error: any) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    if (error.response?.status === 409) {
      const code = apiError?.error?.code;
      throw new Error(
        (code ? ACCEPT_CONFLICT_MESSAGES[code] : undefined) ?? apiError?.error?.message ?? ACCEPT_CONFLICT_FALLBACK
      );
    }
    throw new Error(apiError?.error?.message || 'Error al aceptar el viaje');
  }
};

export const driverArriving = async (tripId: string, data: { latitude: number; longitude: number }) => {
  try {
    const response = await transferApi.post(`/rides/${tripId}/driver-arriving`, data);
    return response.data;
  } catch (error: any) {
    const apiError = error.response?.data as ApiErrorResponse;
    throw new Error(apiError?.error?.message || 'Error al notificar en camino');
  }
};

export const driverArrived = async (tripId: string, data: { latitude: number; longitude: number }) => {
  try {
    const response = await transferApi.post(`/rides/${tripId}/driver-arrived`, data);
    return response.data;
  } catch (error: any) {
    const apiError = error.response?.data as ApiErrorResponse;
    throw new Error(apiError?.error?.message || 'Error al notificar llegada');
  }
};

export const startTrip = async (
  tripId: string, 
  data: { latitude: number; longitude: number; boarding_pin?: string }
) => {
  try {
    const payload: { latitude: number; longitude: number; boarding_pin?: string } = {
      latitude: data.latitude,
      longitude: data.longitude,
    };
    if (data.boarding_pin && data.boarding_pin.length === 4) {
      payload.boarding_pin = data.boarding_pin;
    }
    const response = await transferApi.post(`/rides/${tripId}/start`, payload);
    return response.data;
  } catch (error: any) {
    const apiError = error.response?.data as ApiErrorResponse;
    throw new Error(apiError?.error?.message || 'Error al iniciar viaje. Verifique el PIN.');
  }
};

export const driverCancelTrip = async (
  tripId: string,
  data: {
    reason_code?: string;
    reasonCode?: string;
    notes?: string;
    latitude: number;
    longitude: number;
  }
) => {
  try {
    const canonicalCode = data.reasonCode || data.reason_code || 'NO_REASON';
    const payload = {
      ...data,
      reason_code: canonicalCode,
      reasonCode: canonicalCode,
    };
    const response = await transferApi.post(`/rides/${tripId}/driver-cancel`, payload);
    return response.data;
  } catch (error: any) {
    const apiError = error.response?.data as ApiErrorResponse;
    throw new Error(apiError?.error?.message || 'Error al cancelar viaje');
  }
};

export const completeTrip = async (tripId: string, data: { latitude: number; longitude: number }) => {
  try {
    const idempotencyKey = `${tripId}-complete-${Date.now()}`;
    const response = await transferApi.post(`/rides/${tripId}/complete`, data, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
    return response.data;
  } catch (error: any) {
    const apiError = error.response?.data as ApiErrorResponse;
    throw new Error(apiError?.error?.message || 'Error al finalizar viaje');
  }
};

export const ratePassenger = async (
  tripId: string, 
  data: { rating: number; comment?: string; tags?: string[] }
) => {
  try {
    const payload: { rating: number; comment?: string; tags?: string[] } = {
      rating: data.rating,
    };
    if (data.comment?.trim()) {
      payload.comment = data.comment.trim();
    }
    if (data.tags && data.tags.length > 0) {
      payload.tags = data.tags;
    }
    const response = await transferApi.post(`/rides/${tripId}/rate-passenger`, payload);
    return response.data;
  } catch (error: any) {
    const apiError = error.response?.data as ApiErrorResponse;
    throw new Error(apiError?.error?.message || 'Error al calificar al pasajero');
  }
};

export const getTripById = async (tripId: string): Promise<Trip> => {
  try {
    const response = await transferApi.get<{ data: Trip }>(`/rides/${tripId}`);
    return response.data.data;
  } catch (error: any) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    throw new TripRequestError(
      apiError?.error?.message || 'Error al consultar estado del viaje',
      error.response?.status,
      apiError?.error?.code
    );
  }
};

export const getActiveTrip = async (): Promise<ActiveTripSummary | null> => {
  try {
    const response = await transferApi.get<ActiveTripResponse>('/driver/me/active-trip');
    return response.data?.data?.trip ?? null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    throw new TripRequestError(
      apiError?.error?.message || 'Error al consultar viaje activo del conductor',
      error.response?.status,
      apiError?.error?.code
    );
  }
};

export const getDriverScheduledTrips = async (): Promise<DriverScheduledTrip[]> => {
  try {
    const response = await transferApi.get<DriverScheduledTripsResponse>('/driver/me/scheduled-trips');
    return response.data?.data?.trips ?? [];
  } catch (error: any) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    const status = error.response?.status;
    let fallbackMessage = 'Error al consultar viajes programados';
    if (status === 404) {
      fallbackMessage = 'El servicio de viajes programados no está disponible en este momento.';
    } else if (status === 401 || status === 403) {
      fallbackMessage = 'No tenés permisos para ver las reservas programadas.';
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      fallbackMessage = 'El servidor tardó demasiado en responder. Por favor, reintentá.';
    }

    const rawMessage = apiError?.error?.message;
    const isGenericNotFound = rawMessage && rawMessage.includes('The requested route does not exist');

    throw new TripRequestError(
      rawMessage && !isGenericNotFound ? rawMessage : fallbackMessage,
      status,
      apiError?.error?.code
    );
  }
};

