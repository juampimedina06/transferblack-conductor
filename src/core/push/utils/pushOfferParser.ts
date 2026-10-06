import { TripOfferPayload } from '@/core/trip/interface/trip.interface';
import { PushTripOfferPayload, PushTripOfferCancelPayload } from '../interface/pushToken.interface';

/**
 * Valida y parsea el payload data-only de una oferta recibida por push.
 * Retorna null si no es una oferta válida o si ya expiró según expiresAt.
 */
export function parsePushTripOffer(
  rawData?: Record<string, unknown> | null,
  nowMs = Date.now()
): TripOfferPayload | null {
  if (!rawData || rawData.type !== 'trip:offer') {
    return null;
  }

  const data = rawData as unknown as PushTripOfferPayload;

  if (!data.offerId || !data.tripId || !data.expiresAt) {
    return null;
  }

  const expirationDate = new Date(data.expiresAt);
  const expirationMs = expirationDate.getTime();

  if (Number.isNaN(expirationMs) || expirationMs <= nowMs) {
    // Oferta ya expirada o timestamp inválido
    return null;
  }

  const remainingSeconds = Math.max(1, Math.floor((expirationMs - nowMs) / 1000));
  const ttlSeconds = data.ttlSeconds
    ? Math.min(Number(data.ttlSeconds), remainingSeconds)
    : remainingSeconds;

  const priceNumber = Number(data.price) || 0;

  return {
    tripId: String(data.tripId),
    offerId: String(data.offerId),
    ttlSeconds,
    expiresAt: data.expiresAt,
    fare: {
      netEarnings: priceNumber,
      totalFare: priceNumber,
      commission: 0,
      currency: 'ARS',
      paymentMethod: 'electronic',
    },
    pickup: {
      address: String(data.origin || 'Origen indicado en app'),
      subtitle: null,
      etaMinutes: 5,
    },
    dropoff: {
      address: String(data.destination || 'Destino indicado en app'),
      subtitle: null,
      durationMinutes: Number(data.durationMinutes) || 15,
    },
    passenger: {
      fullName: String(data.passengerName || 'Pasajero TransferBlack'),
      rating: Number(data.passengerRating) || 5.0,
      category: 'Black',
      preferences: [],
    },
  };
}

/**
 * Determina si el payload recibido corresponde a una cancelación de oferta.
 */
export function isPushTripCancel(
  rawData?: Record<string, unknown> | null
): rawData is PushTripOfferCancelPayload {
  return (
    !!rawData &&
    rawData.type === 'trip:offer:cancel' &&
    typeof rawData.offerId === 'string' &&
    typeof rawData.tripId === 'string'
  );
}
