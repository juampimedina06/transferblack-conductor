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
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  phone_e164?: string | null;
  rating: number;
  completedTrips?: number;
  category: string;
  preferences: string[];
}

export interface TripOfferPayload {
  tripId: string;
  offerId: string;
  ttlSeconds: number;
  expiresAt?: string | null;
  fare: TripFareDetails;
  pickup: TripPickupDetails;
  dropoff: TripDropoffDetails;
  passenger: TripPassengerDetails;
  routeGeometry?: any;
  require_pin?: boolean;
  boarding_pin?: string | null;
  third_party?: {
    name: string;
    phone_e164: string;
    email?: string | null;
  };
  chat?: {
    coordinator_user_id: string;
    coordinator_name: string;
    coordinator_role: 'passenger' | 'requester';
    passenger_user_id: string | null;
    is_third_party_trip: boolean;
    third_party?: {
      name: string;
      phone_e164: string;
    } | null;
  };
  passengerRating?: {
    average: number;
    count: number;
  };
}

export interface DriverScheduledTripPoint {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DriverScheduledTripPassenger {
  id: string | null;
  firstName: string | null;
  phone: string | null;
}

export interface DriverScheduledTrip {
  id: string;
  code: string;
  status: string;
  bookingType: string;
  scheduledAt: string;
  origin: DriverScheduledTripPoint | null;
  destination: DriverScheduledTripPoint | null;
  passenger: DriverScheduledTripPassenger | null;
  thirdPartyName?: string | null;
  thirdPartyPhone?: string | null;
  fare: number;
  netEarnings: number;
  currency: string;
  isRecurring: boolean;
}

export interface DriverScheduledTripsResponse {
  status: string;
  data: {
    trips: DriverScheduledTrip[];
  };
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
  driver_earnings?: number;
  fare_details?: TripFareDetails;
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
    coordinator_name: string;
    coordinator_role: 'passenger' | 'requester';
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
  thirdPartyName?: string | null;
  thirdPartyPhone?: string | null;
  passengerRating?: {
    average: number;
    count: number;
  };
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

/**
 * Error de API que conserva el status y el codigo del backend. Las actions
 * lanzan `Error` pelado, y el status se perdia: los `catch` que comparaban
 * `err.response.status` nunca se cumplian porque el `Error` recien creado no
 * arrastra la respuesta de axios.
 */
export class TripRequestError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'TripRequestError';
    this.status = status;
    this.code = code;
  }
}

export interface ActiveTripPassengerSummary {
  id: string | null;
  firstName: string;
  phone: string;
}

export interface ActiveTripLocationSummary {
  address: string;
  latitude: number;
  longitude: number;
}

export interface ActiveTripSummary {
  id: string;
  code: string;
  status: 'assigned' | 'driver_arriving' | 'driver_arrived' | 'in_progress';
  origin: ActiveTripLocationSummary;
  destination: ActiveTripLocationSummary;
  passenger: ActiveTripPassengerSummary;
  fare: number;
  startedAt: string | null;
  paymentMethod: string;
  isVoucher?: boolean;
}

export interface ActiveTripResponse {
  status: string;
  data: {
    trip: ActiveTripSummary | null;
  };
}

export interface PaymentMethodInfo {
  label: string;
  icon: 'cash-outline' | 'card-outline' | 'business-outline';
  isCash: boolean;
}

export const getPaymentMethodInfo = (method?: string | null): PaymentMethodInfo => {
  const m = method?.toLowerCase().trim() || '';
  if (m === 'cash' || m === 'efectivo') {
    return { label: 'Efectivo', icon: 'cash-outline', isCash: true };
  }
  if (m === 'corporate' || m === 'corporativo') {
    return { label: 'Corporativo', icon: 'business-outline', isCash: false };
  }
  return { label: 'Tarjeta', icon: 'card-outline', isCash: false };
};

export const calculateTripDistanceKm = (
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null,
  fallbackMinutes?: number | null
): string => {
  if (
    lat1 != null &&
    lon1 != null &&
    lat2 != null &&
    lon2 != null &&
    (lat1 !== 0 || lon1 !== 0) &&
    (lat2 !== 0 || lon2 !== 0)
  ) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;
    const drivingKm = straightKm * 1.25; // factor urbano promedio
    if (drivingKm >= 0.1) {
      return `${drivingKm.toFixed(1)} km`;
    }
  }
  if (fallbackMinutes && fallbackMinutes > 0) {
    const estimatedKm = Math.max(1, fallbackMinutes * 0.55).toFixed(1);
    return `${estimatedKm} km`;
  }
  return '3.5 km';
};
