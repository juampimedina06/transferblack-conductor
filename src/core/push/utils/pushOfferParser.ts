import { TripOfferPayload } from '@/core/trip/interface/trip.interface';
import {
  PushTripOfferCancelPayload,
  PushTripOfferPayload,
} from '../interface/pushToken.interface';

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Valida y parsea el payload data-only de una oferta recibida por push.
 * Retorna null si no es una oferta válida o si ya expiró según expiresAt.
 */
export function parsePushTripOffer(
  rawData?: Record<string, unknown> | null,
  nowMs = Date.now()
): TripOfferPayload | null {
  const isOfferEvent =
    !!rawData &&
    (rawData.type === 'trip:offer' ||
      rawData.type === 'NEW_TRIP_OFFER' ||
      rawData.eventType === 'NEW_TRIP_OFFER');

  if (!isOfferEvent) {
    return null;
  }

  const data = rawData as unknown as PushTripOfferPayload;

  if (!data.offerId || !data.tripId || !data.expiresAt) {
    return null;
  }

  const expirationDate = new Date(String(data.expiresAt));
  const expirationMs = expirationDate.getTime();

  if (Number.isNaN(expirationMs) || expirationMs <= nowMs) {
    // Oferta ya expirada o timestamp inválido
    return null;
  }

  const remainingSeconds = Math.max(1, Math.floor((expirationMs - nowMs) / 1000));
  const rawTtl = parseFiniteNumber(data.ttlSeconds);
  const ttlSeconds =
    rawTtl !== null && rawTtl > 0 ? Math.min(rawTtl, remainingSeconds) : remainingSeconds;

  const fareObject = parseJsonRecord(data.fare) ?? parseJsonRecord(data.price);
  const directPrice = parseFiniteNumber(data.price);
  const directFare = parseFiniteNumber(data.fare);
  const objectTotalFare = fareObject ? parseFiniteNumber(fareObject.totalFare) : null;
  const objectNetEarnings = fareObject ? parseFiniteNumber(fareObject.netEarnings) : null;

  const totalFare = objectTotalFare ?? directPrice ?? objectNetEarnings ?? directFare ?? 0;
  const netEarnings = objectNetEarnings ?? directFare ?? objectTotalFare ?? directPrice ?? 0;
  const commission = (fareObject ? parseFiniteNumber(fareObject.commission) : null) ?? 0;
  const currency =
    (fareObject ? parseNonEmptyString(fareObject.currency) : null) ?? 'ARS';
  const paymentMethod =
    (fareObject ? parseNonEmptyString(fareObject.paymentMethod) : null) ?? 'electronic';

  const pickupObj = parseJsonRecord(rawData.pickup);
  const dropoffObj = parseJsonRecord(rawData.dropoff);
  const passengerObj = parseJsonRecord(rawData.passenger);

  const originAddress =
    parseNonEmptyString(data.origin) ??
    parseNonEmptyString(pickupObj?.address) ??
    'Origen indicado en app';
  const destinationAddress =
    parseNonEmptyString(data.destination) ??
    parseNonEmptyString(dropoffObj?.address) ??
    'Destino indicado en app';

  const pickupLat = pickupObj ? parseFiniteNumber(pickupObj.latitude) : null;
  const pickupLng = pickupObj ? parseFiniteNumber(pickupObj.longitude) : null;
  const dropoffLat = dropoffObj ? parseFiniteNumber(dropoffObj.latitude) : null;
  const dropoffLng = dropoffObj ? parseFiniteNumber(dropoffObj.longitude) : null;

  const passengerName =
    parseNonEmptyString(data.passengerName) ??
    parseNonEmptyString(passengerObj?.fullName) ??
    parseNonEmptyString(passengerObj?.firstName) ??
    'Pasajero TransferBlack';

  const passengerRating =
    parseFiniteNumber(data.passengerRating) ??
    (passengerObj ? parseFiniteNumber(passengerObj.rating) : null) ??
    5.0;

  const durationMinutes =
    parseFiniteNumber(data.durationMinutes) ??
    (dropoffObj ? parseFiniteNumber(dropoffObj.durationMinutes) : null) ??
    15;

  const etaMinutes =
    (pickupObj ? parseFiniteNumber(pickupObj.etaMinutes) : null) ?? 5;

  return {
    tripId: String(data.tripId),
    offerId: String(data.offerId),
    ttlSeconds,
    expiresAt: String(data.expiresAt),
    fare: {
      netEarnings,
      totalFare,
      commission,
      currency,
      paymentMethod,
    },
    pickup: {
      address: originAddress,
      subtitle: pickupObj ? parseNonEmptyString(pickupObj.subtitle) : null,
      ...(pickupLat !== null && pickupLng !== null
        ? { latitude: pickupLat, longitude: pickupLng }
        : {}),
      etaMinutes,
    },
    dropoff: {
      address: destinationAddress,
      subtitle: dropoffObj ? parseNonEmptyString(dropoffObj.subtitle) : null,
      ...(dropoffLat !== null && dropoffLng !== null
        ? { latitude: dropoffLat, longitude: dropoffLng }
        : {}),
      durationMinutes,
    },
    passenger: {
      fullName: passengerName,
      rating: passengerRating,
      category:
        (passengerObj ? parseNonEmptyString(passengerObj.category) : null) ?? 'Black',
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
  const isCancelEvent =
    !!rawData &&
    (rawData.type === 'trip:offer:cancel' ||
      rawData.type === 'TRIP_OFFER_CANCELLED' ||
      rawData.eventType === 'TRIP_OFFER_CANCELLED');

  return (
    isCancelEvent &&
    typeof rawData.offerId === 'string' &&
    typeof rawData.tripId === 'string'
  );
}

/**
 * Determina si el payload de la notificación corresponde a un evento de documentación.
 */
export function isPushDocumentEvent(
  rawData?: Record<string, unknown> | null
): boolean {
  if (!rawData) return false;
  const eventName = String(rawData.type || rawData.event || '');
  return (
    eventName === 'docs:expiring' ||
    eventName === 'docs:expired' ||
    eventName === 'document_expiring' ||
    eventName === 'document_expired'
  );
}
