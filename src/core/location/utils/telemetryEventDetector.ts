import { DEFAULT_TELEMETRY_CONFIG } from '../constants/telemetry.constants';
import {
  LocationReading,
  TelemetryConfig,
  TelemetryDetectorState,
  TelemetryEventType,
} from '../interface/telemetry.interface';

export const initialTelemetryDetectorState: TelemetryDetectorState = {
  stoppedEmitted: false,
  stationarySince: null,
  lastSharpTurnEmittedAt: null,
};

/**
 * Calculates absolute minimal angular delta between two headings (0 - 360 deg)
 * taking into account modular wrap-around at 360 degrees.
 */
export const calculateHeadingDelta = (h1: number, h2: number): number => {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
};

export interface DetectTelemetryResult {
  event: TelemetryEventType | null;
  nextState: TelemetryDetectorState;
}

/**
 * Pure evaluation function that inspects a sliding window of location readings
 * and returns domain events ('stop' | 'sharp_turn' | null) along with updated state.
 */
export const detectTelemetryEvent = (
  readings: LocationReading[],
  currentState: TelemetryDetectorState = initialTelemetryDetectorState,
  config: TelemetryConfig = DEFAULT_TELEMETRY_CONFIG,
): DetectTelemetryResult => {
  if (!readings || readings.length === 0) {
    return { event: null, nextState: { ...currentState } };
  }

  const current = readings[readings.length - 1];

  // Discard readings with unacceptable accuracy
  if (
    current.accuracy !== null &&
    current.accuracy !== undefined &&
    current.accuracy > config.maxAccuracyMeters
  ) {
    return { event: null, nextState: { ...currentState } };
  }

  const currentSpeed = current.speed ?? 0;
  const isStationary = currentSpeed <= config.stopSpeedThresholdMps;

  // ── 1. Stop Detection ──────────────────────────────────────────────────────────
  if (isStationary) {
    // Determine the earliest consecutive stationary timestamp from the provided readings window
    let earliestConsecutiveStationary = current.timestamp;
    for (let i = readings.length - 1; i >= 0; i--) {
      const sample = readings[i];
      const sampleSpeed = sample.speed ?? 0;
      if (sampleSpeed <= config.stopSpeedThresholdMps) {
        earliestConsecutiveStationary = sample.timestamp;
      } else {
        break;
      }
    }

    const stationarySince =
      currentState.stationarySince !== null
        ? Math.min(currentState.stationarySince, earliestConsecutiveStationary)
        : earliestConsecutiveStationary;

    const stationaryDuration = current.timestamp - stationarySince;

    if (
      stationaryDuration >= config.stopDurationThresholdMs &&
      !currentState.stoppedEmitted
    ) {
      return {
        event: 'stop',
        nextState: {
          ...currentState,
          stationarySince,
          stoppedEmitted: true,
        },
      };
    }

    return {
      event: null,
      nextState: {
        ...currentState,
        stationarySince,
      },
    };
  }

  // Moving above stationary threshold: reset stop state
  const resetStopState: TelemetryDetectorState = {
    ...currentState,
    stationarySince: null,
    stoppedEmitted: false,
  };

  // ── 2. Sharp Turn Detection ──────────────────────────────────────────────────
  if (currentSpeed < config.sharpTurnMinSpeedMps) {
    return { event: null, nextState: resetStopState };
  }

  // Check cooldown
  if (
    resetStopState.lastSharpTurnEmittedAt !== null &&
    current.timestamp - resetStopState.lastSharpTurnEmittedAt < config.sharpTurnCooldownMs
  ) {
    return { event: null, nextState: resetStopState };
  }

  if (current.heading === null || current.heading === undefined) {
    return { event: null, nextState: resetStopState };
  }

  // Evaluate heading change across rolling window
  const windowStart = current.timestamp - config.sharpTurnWindowMs;
  const validWindowReadings = readings.filter(
    (r) =>
      r.timestamp >= windowStart &&
      r.timestamp <= current.timestamp &&
      r.heading !== null &&
      r.heading !== undefined &&
      (r.accuracy === null || r.accuracy === undefined || r.accuracy <= config.maxAccuracyMeters),
  );

  let sharpTurnDetected = false;
  for (const sample of validWindowReadings) {
    if (sample.heading !== null && sample.heading !== undefined) {
      const delta = calculateHeadingDelta(sample.heading, current.heading);
      if (delta >= config.sharpTurnAngleDeg) {
        sharpTurnDetected = true;
        break;
      }
    }
  }

  if (sharpTurnDetected) {
    return {
      event: 'sharp_turn',
      nextState: {
        ...resetStopState,
        lastSharpTurnEmittedAt: current.timestamp,
      },
    };
  }

  return { event: null, nextState: resetStopState };
};
