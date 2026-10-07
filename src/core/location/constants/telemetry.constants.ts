import { TelemetryConfig } from '../interface/telemetry.interface';

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  pingIntervalMs: 3000, // Ping frequency of ~3 seconds during active trip
  maxAccuracyMeters: 35, // Discard GPS fixes with accuracy degraded beyond 35 meters
  stopSpeedThresholdMps: 0.5, // Speeds below 0.5 m/s (~1.8 km/h) treated as stationary
  stopDurationThresholdMs: 5000, // Stationary condition sustained for 5s triggers 'stop' event
  sharpTurnMinSpeedMps: 3.0, // Minimum speed of 3.0 m/s (~10.8 km/h) to filter GPS noise
  sharpTurnAngleDeg: 60, // Heading variation of 60 degrees or more triggers 'sharp_turn'
  sharpTurnWindowMs: 3000, // Evaluated across a rolling 3-second window
  sharpTurnCooldownMs: 8000, // 8-second cooldown to avoid event spamming
};
