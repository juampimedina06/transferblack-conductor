import {
  DriverLocationPayload,
  LocationReading,
  TelemetryConfig,
  TelemetryDetectorState,
  TelemetryEventType,
} from '../interface/telemetry.interface';
import { detectTelemetryEvent } from '../utils/telemetryEventDetector';

export interface ProcessTelemetryResult {
  emittedPayload: DriverLocationPayload | null;
  updatedHistory: LocationReading[];
  nextDetectorState: TelemetryDetectorState;
}

/**
 * Pure evaluation function for a single telemetry tick.
 * Evaluates active trip condition, socket connectivity, GPS accuracy,
 * rolling history window, and pure stop/sharp_turn event detection.
 */
export const processTelemetryTick = (
  currentReading: LocationReading | null,
  readingsHistory: LocationReading[],
  detectorState: TelemetryDetectorState,
  config: TelemetryConfig,
  activeTripId: string | null,
  isSocketConnected: boolean,
  isAvailable: boolean = true,
): ProcessTelemetryResult => {
  if ((!activeTripId && !isAvailable) || !isSocketConnected || !currentReading) {
    return {
      emittedPayload: null,
      updatedHistory: readingsHistory,
      nextDetectorState: detectorState,
    };
  }

  // Validate coordinates: must be finite numbers within valid lat/lng range
  const lat = Number(currentReading.latitude);
  const lng = Number(currentReading.longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      emittedPayload: null,
      updatedHistory: readingsHistory,
      nextDetectorState: detectorState,
    };
  }

  // Filter out fixes with degraded accuracy
  if (
    currentReading.accuracy !== null &&
    currentReading.accuracy !== undefined &&
    typeof currentReading.accuracy === 'number' &&
    !isNaN(currentReading.accuracy) &&
    currentReading.accuracy > config.maxAccuracyMeters
  ) {
    return {
      emittedPayload: null,
      updatedHistory: readingsHistory,
      nextDetectorState: detectorState,
    };
  }

  // Add to sliding history and prune entries older than 15 seconds
  const now = Date.now();
  const cutoff = now - 15000;
  const updatedHistory = [
    ...readingsHistory.filter((r) => r.timestamp >= cutoff),
    { ...currentReading, timestamp: now },
  ];

  // Run pure event detection only during active trip
  let event: TelemetryEventType | null = null;
  let nextState = detectorState;

  if (activeTripId) {
    const detection = detectTelemetryEvent(
      updatedHistory,
      detectorState,
      config,
    );
    event = detection.event;
    nextState = detection.nextState;
  }

  const payload: DriverLocationPayload = {
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    timestamp: now,
  };

  // Only assign numeric fields if valid and non-negative; NEVER send null to backend Zod schema
  if (
    typeof currentReading.heading === 'number' &&
    !isNaN(currentReading.heading) &&
    currentReading.heading >= 0 &&
    currentReading.heading <= 360
  ) {
    payload.heading = currentReading.heading;
  }

  if (
    typeof currentReading.speed === 'number' &&
    !isNaN(currentReading.speed) &&
    currentReading.speed >= 0
  ) {
    payload.speed = currentReading.speed;
  }

  if (
    typeof currentReading.accuracy === 'number' &&
    !isNaN(currentReading.accuracy) &&
    currentReading.accuracy >= 0
  ) {
    payload.accuracy = currentReading.accuracy;
  }

  if (activeTripId && event) {
    payload.event = event;
  }

  return {
    emittedPayload: payload,
    updatedHistory,
    nextDetectorState: nextState,
  };
};
