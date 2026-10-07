import { describe, it, expect } from 'vitest';
import {
  detectTelemetryEvent,
  calculateHeadingDelta,
  initialTelemetryDetectorState,
} from '../../src/core/location/utils/telemetryEventDetector';
import {
  LocationReading,
  TelemetryConfig,
} from '../../src/core/location/interface/telemetry.interface';

const TEST_CONFIG: TelemetryConfig = {
  pingIntervalMs: 3000,
  maxAccuracyMeters: 30,
  stopSpeedThresholdMps: 0.5,
  stopDurationThresholdMs: 5000,
  sharpTurnMinSpeedMps: 3.0,
  sharpTurnAngleDeg: 60,
  sharpTurnWindowMs: 3000,
  sharpTurnCooldownMs: 8000,
};

describe('calculateHeadingDelta', () => {
  it('calculates direct acute angle difference', () => {
    expect(calculateHeadingDelta(10, 50)).toBe(40);
    expect(calculateHeadingDelta(90, 30)).toBe(60);
  });

  it('handles 360 wrap-around correctly', () => {
    // 355° to 15° is 20°
    expect(calculateHeadingDelta(355, 15)).toBe(20);
    expect(calculateHeadingDelta(10, 350)).toBe(20);
    // 350° to 60° is 70°
    expect(calculateHeadingDelta(350, 60)).toBe(70);
  });

  it('handles exact 180 and 0 degrees', () => {
    expect(calculateHeadingDelta(0, 180)).toBe(180);
    expect(calculateHeadingDelta(100, 100)).toBe(0);
  });
});

describe('detectTelemetryEvent - Stop Detection', () => {
  it('does not emit stop when stationary period is less than threshold', () => {
    const readings: LocationReading[] = [
      { latitude: 10, longitude: 10, speed: 0.1, accuracy: 5, timestamp: 1000 },
      { latitude: 10, longitude: 10, speed: 0.1, accuracy: 5, timestamp: 4000 }, // 3s elapsed
    ];

    const result = detectTelemetryEvent(readings, initialTelemetryDetectorState, TEST_CONFIG);
    expect(result.event).toBeNull();
    expect(result.nextState.stoppedEmitted).toBe(false);
    expect(result.nextState.stationarySince).toBe(1000);
  });

  it('emits stop once when stationary duration reaches threshold', () => {
    const readings: LocationReading[] = [
      { latitude: 10, longitude: 10, speed: 0.2, accuracy: 5, timestamp: 1000 },
      { latitude: 10, longitude: 10, speed: 0.1, accuracy: 5, timestamp: 4000 },
      { latitude: 10, longitude: 10, speed: 0.0, accuracy: 5, timestamp: 6500 }, // 5.5s elapsed
    ];

    const step1 = detectTelemetryEvent([readings[0]], initialTelemetryDetectorState, TEST_CONFIG);
    const step2 = detectTelemetryEvent(readings.slice(0, 2), step1.nextState, TEST_CONFIG);
    const step3 = detectTelemetryEvent(readings, step2.nextState, TEST_CONFIG);

    expect(step3.event).toBe('stop');
    expect(step3.nextState.stoppedEmitted).toBe(true);

    // Continued stopped state does not repeat 'stop'
    const step4 = detectTelemetryEvent(
      [...readings, { latitude: 10, longitude: 10, speed: 0.0, accuracy: 5, timestamp: 9500 }],
      step3.nextState,
      TEST_CONFIG,
    );
    expect(step4.event).toBeNull();
    expect(step4.nextState.stoppedEmitted).toBe(true);
  });

  it('resets stop state when vehicle starts moving again and can trigger stop in subsequent stop', () => {
    const stationaryState = {
      stoppedEmitted: true,
      stationarySince: 1000,
      lastSharpTurnEmittedAt: null,
    };

    // Moving reading (speed 5 m/s > 0.5)
    const movingReading: LocationReading = {
      latitude: 10.01,
      longitude: 10.01,
      speed: 5.0,
      accuracy: 5,
      timestamp: 12000,
    };

    const movingResult = detectTelemetryEvent([movingReading], stationaryState, TEST_CONFIG);
    expect(movingResult.event).toBeNull();
    expect(movingResult.nextState.stoppedEmitted).toBe(false);
    expect(movingResult.nextState.stationarySince).toBeNull();

    // New stationary cycle
    const newStopResult1 = detectTelemetryEvent(
      [{ latitude: 10.02, longitude: 10.02, speed: 0.1, accuracy: 5, timestamp: 15000 }],
      movingResult.nextState,
      TEST_CONFIG,
    );
    const newStopResult2 = detectTelemetryEvent(
      [
        { latitude: 10.02, longitude: 10.02, speed: 0.1, accuracy: 5, timestamp: 15000 },
        { latitude: 10.02, longitude: 10.02, speed: 0.1, accuracy: 5, timestamp: 20500 },
      ],
      newStopResult1.nextState,
      TEST_CONFIG,
    );

    expect(newStopResult2.event).toBe('stop');
    expect(newStopResult2.nextState.stoppedEmitted).toBe(true);
  });
});

describe('detectTelemetryEvent - Sharp Turn Detection', () => {
  it('detects sharp turn when delta heading >= 60 deg within window at valid speed', () => {
    const readings: LocationReading[] = [
      { latitude: 10, longitude: 10, heading: 10, speed: 6.0, accuracy: 5, timestamp: 1000 },
      { latitude: 10.01, longitude: 10.01, heading: 75, speed: 5.5, accuracy: 5, timestamp: 3500 }, // 65 deg turn in 2.5s
    ];

    const result = detectTelemetryEvent(readings, initialTelemetryDetectorState, TEST_CONFIG);
    expect(result.event).toBe('sharp_turn');
    expect(result.nextState.lastSharpTurnEmittedAt).toBe(3500);
  });

  it('detects sharp turn across 360 wrap-around (e.g. 350 deg to 60 deg = 70 deg)', () => {
    const readings: LocationReading[] = [
      { latitude: 10, longitude: 10, heading: 350, speed: 7.0, accuracy: 5, timestamp: 2000 },
      { latitude: 10.01, longitude: 10.01, heading: 60, speed: 7.0, accuracy: 5, timestamp: 4000 },
    ];

    const result = detectTelemetryEvent(readings, initialTelemetryDetectorState, TEST_CONFIG);
    expect(result.event).toBe('sharp_turn');
  });

  it('does NOT detect sharp turn if vehicle speed is below minimum threshold (filters stationary noise)', () => {
    const readings: LocationReading[] = [
      { latitude: 10, longitude: 10, heading: 10, speed: 1.0, accuracy: 5, timestamp: 1000 }, // speed 1.0 < min 3.0
      { latitude: 10, longitude: 10, heading: 120, speed: 1.2, accuracy: 5, timestamp: 2500 },
    ];

    const result = detectTelemetryEvent(readings, initialTelemetryDetectorState, TEST_CONFIG);
    expect(result.event).toBeNull();
  });

  it('respects cooldown window to prevent spamming sharp turns', () => {
    const stateWithCooldown = {
      stoppedEmitted: false,
      stationarySince: null,
      lastSharpTurnEmittedAt: 5000,
    };

    const readings: LocationReading[] = [
      { latitude: 10, longitude: 10, heading: 0, speed: 8.0, accuracy: 5, timestamp: 8000 },
      { latitude: 10.01, longitude: 10.01, heading: 90, speed: 8.0, accuracy: 5, timestamp: 10000 }, // 5s after previous (cooldown is 8s)
    ];

    const result = detectTelemetryEvent(readings, stateWithCooldown, TEST_CONFIG);
    expect(result.event).toBeNull();

    // After cooldown expires (e.g. at 14000ms: 14000 - 5000 = 9000 >= 8000)
    const readingsPostCooldown: LocationReading[] = [
      { latitude: 10.02, longitude: 10.02, heading: 0, speed: 8.0, accuracy: 5, timestamp: 13000 },
      { latitude: 10.03, longitude: 10.03, heading: 80, speed: 8.0, accuracy: 5, timestamp: 14000 },
    ];
    const postCooldownResult = detectTelemetryEvent(
      readingsPostCooldown,
      stateWithCooldown,
      TEST_CONFIG,
    );
    expect(postCooldownResult.event).toBe('sharp_turn');
  });
});

describe('detectTelemetryEvent - Accuracy Filtering', () => {
  it('ignores readings with accuracy worse than maxAccuracyMeters', () => {
    const readings: LocationReading[] = [
      { latitude: 10, longitude: 10, speed: 0.0, accuracy: 50, timestamp: 10000 }, // accuracy 50 > max 30
    ];

    const result = detectTelemetryEvent(readings, initialTelemetryDetectorState, TEST_CONFIG);
    expect(result.event).toBeNull();
  });
});
