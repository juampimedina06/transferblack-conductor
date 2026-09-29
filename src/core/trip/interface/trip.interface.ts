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
  require_pin?: boolean;
  boarding_pin?: string | null;
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

export interface Trip {
  id: string;
  public_code: string;
  status: 'draft' | 'assigned' | 'driver_arriving' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';
  service_type_id: string;
  payment_method: string;
  driver_id: string;
  vehicle_id: string;
  estimated_fare: string;
  final_fare: string;
  currency: string;
  confirmed_at: string;
  assigned_at: string;
  driver_arrived_at: string;
  started_at: string;
  finished_at: string;
  cancelled_at: string;
  cancellation_reason_code?: string;
  third_party?: {
    name: string;
    phone_e164: string;
    email: string;
  };
  chat?: {
    coordinator_user_id: string;
    coordinator_role: string;
    passenger_user_id: string;
    is_third_party_trip: boolean;
    third_party?: {
      name: string;
      phone_e164: string;
    };
  };
  require_pin?: boolean;
  boarding_pin?: string | null;
  pickup?: TripPickupDetails;
  dropoff?: TripDropoffDetails;
  routeGeometry?: any;
  passenger?: TripPassengerDetails;
}

export interface DriverLocationInput {
  latitude: number;
  longitude: number;
}

export interface StartTripInput {
  boarding_pin?: string;
}

export interface DriverCancelInput {
  reason_code: string;
  notes?: string;
  latitude: number;
  longitude: number;
}

export interface TripResponse {
  data: Trip;
}
