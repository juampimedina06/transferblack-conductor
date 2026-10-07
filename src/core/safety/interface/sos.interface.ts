export interface SosRequestPayload {
  clientEventId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  clientTimestamp: string;
}

export interface SosResponse {
  id: string;
  receivedAt: string;
}

export interface QueuedSosEvent extends SosRequestPayload {
  tripId: string;
  retryCount: number;
  lastAttemptAt: number;
}
