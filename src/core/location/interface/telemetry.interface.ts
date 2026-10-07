import { LatLng } from './latLng.interface';

export type TelemetryEventType = 'stop' | 'sharp_turn';

export interface LocationReading extends LatLng {
  heading?: number | null;
  speed?: number | null; // meters per second
  accuracy?: number | null; // meters
  timestamp: number; // ms epoch
}

export interface DriverLocationPayload {
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: number;
  event?: TelemetryEventType;
}

export interface TelemetryConfig {
  pingIntervalMs: number;
  maxAccuracyMeters: number;
  stopSpeedThresholdMps: number;
  stopDurationThresholdMs: number;
  sharpTurnMinSpeedMps: number;
  sharpTurnAngleDeg: number;
  sharpTurnWindowMs: number;
  sharpTurnCooldownMs: number;
}

export interface TelemetryDetectorState {
  stoppedEmitted: boolean;
  stationarySince: number | null;
  lastSharpTurnEmittedAt: number | null;
}
