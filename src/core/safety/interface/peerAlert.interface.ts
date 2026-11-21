export interface TriggerPeerAlertRequest {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  tripId?: string | null;
  radiusKm?: number;
}

export interface TriggerPeerAlertResponse {
  id: string;
  status: 'active';
  lat: number;
  lng: number;
  notifiedCount: number;
  followersCount: number;
  createdAt: string;
}

export interface CancelPeerAlertResponse {
  id: string;
  status: 'resolved';
  resolvedAt: string;
}

export interface FollowPeerAlertRequest {
  lat?: number;
  lng?: number;
}

export interface FollowPeerAlertResponse {
  alertId: string;
  driverId: string;
  driverName: string;
  vehicleLabel: string | null;
  plate: string | null;
  lat: number;
  lng: number;
  followersCount: number;
}

export interface UnfollowPeerAlertResponse {
  alertId: string;
  followersCount: number;
}

export interface IncomingPeerAlertPayload {
  alertId: string;
  driverId: string;
  driverName: string;
  vehicleLabel: string | null;
  plate: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  createdAt: string;
}

export interface PeerAlertFollowerJoinedPayload {
  alertId: string;
  followerDriverId: string;
  followerName: string;
  followersCount: number;
  distanceKm?: number;
}

export interface PeerAlertLocationPayload {
  alertId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
}

export interface PeerAlertResolvedPayload {
  alertId: string;
  resolvedAt: string;
}
