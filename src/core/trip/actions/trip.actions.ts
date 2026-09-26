import { transferApi } from '../../api/transferApi';
import { ApiErrorResponse } from '../../auth/interface/auth.interface';

import { AcceptOfferInput, AcceptOfferResponse } from '../interface/trip.interface';
export type { AcceptOfferInput, AcceptOfferResponse };

export const acceptTripOffer = async (tripId: string, data: AcceptOfferInput): Promise<AcceptOfferResponse> => {
  try {
    const response = await transferApi.post<AcceptOfferResponse>(`/rides/${tripId}/accept`, data);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      throw new Error('Otro conductor fue asignado a este viaje');
    }
    const apiError = error.response?.data as ApiErrorResponse;
    throw new Error(apiError?.error?.message || 'Error al aceptar el viaje');
  }
};
