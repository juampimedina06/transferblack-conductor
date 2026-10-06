import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  token: z.string().min(1, 'Token es requerido'),
  platform: z.enum(['android', 'ios']),
  provider: z.literal('fcm'),
});

export type RegisterPushTokenDto = z.infer<typeof registerPushTokenSchema>;

export interface RegisterPushTokenResponse {
  success: boolean;
  message?: string;
  data?: {
    id?: string;
    token: string;
    platform: 'android' | 'ios';
    provider: 'fcm';
    createdAt?: string;
  };
}

export interface PushTripOfferPayload {
  type: 'trip:offer';
  offerId: string;
  tripId: string;
  expiresAt: string;
  ttlSeconds?: string | number;
  origin?: string;
  destination?: string;
  price?: string | number;
  passengerName?: string;
  passengerRating?: string | number;
  distanceKm?: string | number;
  durationMinutes?: string | number;
  [key: string]: unknown;
}

export interface PushTripOfferCancelPayload {
  type: 'trip:offer:cancel';
  offerId: string;
  tripId: string;
  reason: 'expired' | 'taken' | 'cancelled';
  [key: string]: unknown;
}
