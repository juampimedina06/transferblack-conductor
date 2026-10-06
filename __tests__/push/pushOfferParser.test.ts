import { describe, it, expect } from 'vitest';
import {
  parsePushTripOffer,
  isPushTripCancel,
} from '../../src/core/push/utils/pushOfferParser';

describe('Push Offer Parser & Expiration (TICKET-01)', () => {
  const baseNow = new Date('2026-10-06T10:00:00.000Z').getTime();

  it('parses valid push offer and calculates ttlSeconds based on expiresAt', () => {
    const rawPush = {
      type: 'trip:offer',
      offerId: 'offer-123',
      tripId: 'trip-456',
      expiresAt: '2026-10-06T10:00:25.000Z', // 25 seconds later
      origin: 'Aeropuerto Ezeiza Terminal A',
      destination: 'Hotel Alvear, Recoleta',
      price: '45000',
      passengerName: 'Carlos Gómez',
      passengerRating: '4.9',
    };

    const parsed = parsePushTripOffer(rawPush, baseNow);
    expect(parsed).not.toBeNull();
    expect(parsed?.offerId).toBe('offer-123');
    expect(parsed?.tripId).toBe('trip-456');
    expect(parsed?.ttlSeconds).toBe(25);
    expect(parsed?.pickup.address).toBe('Aeropuerto Ezeiza Terminal A');
    expect(parsed?.dropoff.address).toBe('Hotel Alvear, Recoleta');
    expect(parsed?.fare.totalFare).toBe(45000);
    expect(parsed?.passenger.fullName).toBe('Carlos Gómez');
  });

  it('discards offers whose expiresAt is already in the past', () => {
    const expiredPush = {
      type: 'trip:offer',
      offerId: 'offer-expired',
      tripId: 'trip-999',
      expiresAt: '2026-10-06T09:59:59.000Z', // 1 sec before baseNow
    };

    const parsed = parsePushTripOffer(expiredPush, baseNow);
    expect(parsed).toBeNull();
  });

  it('discards non-offer types or invalid payloads', () => {
    expect(parsePushTripOffer(null, baseNow)).toBeNull();
    expect(parsePushTripOffer({ type: 'other' }, baseNow)).toBeNull();
    expect(
      parsePushTripOffer(
        { type: 'trip:offer', offerId: '1' /* missing tripId, expiresAt */ },
        baseNow
      )
    ).toBeNull();
  });

  it('correctly identifies push trip cancellation payloads', () => {
    const cancelPayload = {
      type: 'trip:offer:cancel',
      offerId: 'offer-123',
      tripId: 'trip-456',
      reason: 'taken',
    };

    expect(isPushTripCancel(cancelPayload)).toBe(true);
    expect(isPushTripCancel({ type: 'other' })).toBe(false);
  });
});
