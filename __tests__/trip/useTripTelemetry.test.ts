import { describe, it, expect } from 'vitest';
import {
  processTelemetryTick,
} from '../../src/core/location/services/telemetryProcessor';
import { DEFAULT_TELEMETRY_CONFIG } from '../../src/core/location/constants/telemetry.constants';
import {
  LocationReading,
  TelemetryConfig,
  TelemetryDetectorState,
} from '../../src/core/location/interface/telemetry.interface';
import { initialTelemetryDetectorState } from '../../src/core/location/utils/telemetryEventDetector';

const TEST_CONFIG: TelemetryConfig = {
  ...DEFAULT_TELEMETRY_CONFIG,
  maxAccuracyMeters: 35,
  stopDurationThresholdMs: 5000,
  sharpTurnAngleDeg: 60,
  sharpTurnWindowMs: 3000,
  sharpTurnCooldownMs: 8000,
};

describe('processTelemetryTick (Telemetry Tick Engine)', () => {
  const activeTripId = 'trip-123';

  it('does NOT emit payload when there is no active trip', () => {
    const reading: LocationReading = {
      latitude: -31.42,
      longitude: -64.18,
      accuracy: 10,
      speed: 10,
      heading: 90,
      timestamp: 1000,
    };

    const result = processTelemetryTick(
      reading,
      [],
      initialTelemetryDetectorState,
      TEST_CONFIG,
      null, // No active trip
      true, // Socket connected
    );

    expect(result.emittedPayload).toBeNull();
    expect(result.updatedHistory).toEqual([]);
  });

  it('does NOT emit payload when socket is disconnected', () => {
    const reading: LocationReading = {
      latitude: -31.42,
      longitude: -64.18,
      accuracy: 10,
      speed: 10,
      heading: 90,
      timestamp: 1000,
    };

    const result = processTelemetryTick(
      reading,
      [],
      initialTelemetryDetectorState,
      TEST_CONFIG,
      activeTripId,
      false, // Socket disconnected
    );

    expect(result.emittedPayload).toBeNull();
  });

  it('does NOT emit payload when currentReading is null', () => {
    const result = processTelemetryTick(
      null,
      [],
      initialTelemetryDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );

    expect(result.emittedPayload).toBeNull();
  });

  it('ignores readings with degraded accuracy exceeding maxAccuracyMeters (e.g. 50m > 35m)', () => {
    const degradedReading: LocationReading = {
      latitude: -31.42,
      longitude: -64.18,
      accuracy: 50, // degraded
      speed: 10,
      heading: 90,
      timestamp: 1000,
    };

    const result = processTelemetryTick(
      degradedReading,
      [],
      initialTelemetryDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );

    expect(result.emittedPayload).toBeNull();
  });

  it('emits properly formatted payload with lat, lng, latitude, longitude and telemetry fields', () => {
    const validReading: LocationReading = {
      latitude: -31.4201,
      longitude: -64.1802,
      accuracy: 8,
      speed: 12.5,
      heading: 45,
      timestamp: 1000,
    };

    const result = processTelemetryTick(
      validReading,
      [],
      initialTelemetryDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );

    expect(result.emittedPayload).toEqual({
      lat: -31.4201,
      lng: -64.1802,
      latitude: -31.4201,
      longitude: -31.4201 ? -64.1802 : 0, // matches exact structure
      heading: 45,
      speed: 12.5,
      accuracy: 8,
      timestamp: 1000,
    });
    expect(result.emittedPayload?.event).toBeUndefined();
    expect(result.updatedHistory).toHaveLength(1);
  });

  it('detects and marks event: "stop" when vehicle is stationary for 5 seconds and does not duplicate', () => {
    const t0 = 1000;
    const reading1: LocationReading = {
      latitude: -31.42,
      longitude: -64.18,
      accuracy: 5,
      speed: 0.1, // stationary
      heading: 0,
      timestamp: t0,
    };

    // First tick (stationary for 0s < 5s)
    const tick1 = processTelemetryTick(
      reading1,
      [],
      initialTelemetryDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );
    expect(tick1.emittedPayload?.event).toBeUndefined();
    expect(tick1.nextDetectorState.stoppedEmitted).toBe(false);

    // Second tick (3s stationary elapsed, threshold is 5s)
    const reading2: LocationReading = {
      latitude: -31.42,
      longitude: -64.18,
      accuracy: 5,
      speed: 0.1,
      heading: 0,
      timestamp: t0 + 3000,
    };
    const tick2 = processTelemetryTick(
      reading2,
      tick1.updatedHistory,
      tick1.nextDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );
    expect(tick2.emittedPayload?.event).toBeUndefined();
    expect(tick2.nextDetectorState.stoppedEmitted).toBe(false);

    // Third tick (6s stationary elapsed >= 5s) -> triggers 'stop'
    const reading3: LocationReading = {
      latitude: -31.42,
      longitude: -64.18,
      accuracy: 5,
      speed: 0.0,
      heading: 0,
      timestamp: t0 + 6000,
    };
    const tick3 = processTelemetryTick(
      reading3,
      tick2.updatedHistory,
      tick2.nextDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );
    expect(tick3.emittedPayload?.event).toBe('stop');
    expect(tick3.nextDetectorState.stoppedEmitted).toBe(true);

    // Fourth tick (9s stationary elapsed) -> must NOT repeat 'stop'
    const reading4: LocationReading = {
      latitude: -31.42,
      longitude: -64.18,
      accuracy: 5,
      speed: 0.0,
      heading: 0,
      timestamp: t0 + 9000,
    };
    const tick4 = processTelemetryTick(
      reading4,
      tick3.updatedHistory,
      tick3.nextDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );
    expect(tick4.emittedPayload?.event).toBeUndefined();
    expect(tick4.nextDetectorState.stoppedEmitted).toBe(true);
  });

  it('marks event: "sharp_turn" when heading changes >= 60 deg within window at valid speed and respects cooldown', () => {
    const reading1: LocationReading = {
      latitude: -31.42,
      longitude: -64.18,
      accuracy: 5,
      speed: 8.0,
      heading: 10,
      timestamp: 1000,
    };
    const tick1 = processTelemetryTick(
      reading1,
      [],
      initialTelemetryDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );

    // Turn 70 deg in 2 seconds (heading 10 -> 80)
    const reading2: LocationReading = {
      latitude: -31.421,
      longitude: -64.181,
      accuracy: 5,
      speed: 7.5,
      heading: 80,
      timestamp: 3000,
    };
    const tick2 = processTelemetryTick(
      reading2,
      tick1.updatedHistory,
      tick1.nextDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );
    expect(tick2.emittedPayload?.event).toBe('sharp_turn');
    expect(tick2.nextDetectorState.lastSharpTurnEmittedAt).toBe(3000);

    // Immediate next tick during cooldown (at 5000ms: elapsed 2000ms < 8000ms cooldown)
    const reading3: LocationReading = {
      latitude: -31.422,
      longitude: -64.182,
      accuracy: 5,
      speed: 8.0,
      heading: 160, // another big turn
      timestamp: 5000,
    };
    const tick3 = processTelemetryTick(
      reading3,
      tick2.updatedHistory,
      tick2.nextDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );
    expect(tick3.emittedPayload?.event).toBeUndefined(); // Suppressed by cooldown
  });

  it('prunes history entries older than 15 seconds to bound memory', () => {
    const oldReading: LocationReading = {
      latitude: -31.42,
      longitude: -64.18,
      accuracy: 5,
      speed: 5.0,
      heading: 0,
      timestamp: 1000,
    };

    const newReading: LocationReading = {
      latitude: -31.43,
      longitude: -64.19,
      accuracy: 5,
      speed: 5.0,
      heading: 0,
      timestamp: 20000, // 19s later (> 15s cutoff)
    };

    const tick = processTelemetryTick(
      newReading,
      [oldReading],
      initialTelemetryDetectorState,
      TEST_CONFIG,
      activeTripId,
      true,
    );

    // Old reading must be pruned
    expect(tick.updatedHistory).toHaveLength(1);
    expect(tick.updatedHistory[0].timestamp).toBe(20000);
  });
});
