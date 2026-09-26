export interface TripFareDetails {
  netEarnings: number;
  totalFare: number;
  commission: number;
  currency: string;
  paymentMethod: string;
}

export interface TripPickupDetails {
  address: string;
  subtitle?: string | null;
  latitude?: number;
  longitude?: number;
  etaMinutes: number;
}

export interface TripDropoffDetails {
  address: string;
  subtitle?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  durationMinutes: number;
}

export interface TripPassengerDetails {
  fullName?: string;
  rating: number;
  completedTrips?: number;
  category: string;
  preferences: string[];
}

export interface TripOfferPayload {
  tripId: string;
  offerId: string;
  ttlSeconds: number;
  fare: TripFareDetails;
  pickup: TripPickupDetails;
  dropoff: TripDropoffDetails;
  passenger: TripPassengerDetails;
  routeGeometry?: any;
}

export interface AcceptOfferInput {
  vehicle_id: string;
  latitude: number;
  longitude: number;
}

export interface AcceptOfferResponse {
  tripId: string;
  driverId: string;
}
