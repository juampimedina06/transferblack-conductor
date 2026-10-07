import {
  DriverLocationPayload,
  LocationReading,
  TelemetryConfig,
  TelemetryDetectorState,
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
): ProcessTelemetryResult => {
  if (!activeTripId || !isSocketConnected || !currentReading) {
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
    currentReading.accuracy > config.maxAccuracyMeters
  ) {
    return {
      emittedPayload: null,
      updatedHistory: readingsHistory,
      nextDetectorState: detectorState,
    };
  }

  // Add to sliding history and prune entries older than 15 seconds
  const now = currentReading.timestamp || Date.now();
  const cutoff = now - 15000;
  const updatedHistory = [
    ...readingsHistory.filter((r) => r.timestamp >= cutoff),
    currentReading,
  ];

  // Run pure event detection
  const { event, nextState } = detectTelemetryEvent(
    updatedHistory,
    detectorState,
    config,
  );

  const payload: DriverLocationPayload = {
    lat: currentReading.latitude,
    lng: currentReading.longitude,
    latitude: currentReading.latitude,
    longitude: currentReading.longitude,
    heading: currentReading.heading ?? null,
    speed: currentReading.speed ?? null,
    accuracy: currentReading.accuracy ?? null,
    timestamp: now,
    ...(event ? { event } : {}),
  };

  return {
    emittedPayload: payload,
    updatedHistory,
    nextDetectorState: nextState,
  };
};
