import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { socket } from '../../../core/socket/socket';
import { DEFAULT_TELEMETRY_CONFIG } from '../../../core/location/constants/telemetry.constants';
import {
  LocationReading,
  TelemetryConfig,
  TelemetryDetectorState,
} from '../../../core/location/interface/telemetry.interface';
import { initialTelemetryDetectorState } from '../../../core/location/utils/telemetryEventDetector';
import { useLocationStore } from '../../maps/store/useLocationStore';
import { useDriverTripStore } from '../store/useDriverTripStore';

import {
  processTelemetryTick,
  ProcessTelemetryResult,
} from '../../../core/location/services/telemetryProcessor';

export { processTelemetryTick, ProcessTelemetryResult };

export interface UseTripTelemetryOptions {
  config?: TelemetryConfig;
}

export const useTripTelemetry = (options?: UseTripTelemetryOptions): void => {
  const config = options?.config ?? DEFAULT_TELEMETRY_CONFIG;
  const activeTrip = useDriverTripStore((state) => state.activeTrip);
  const { watchLocation } = useLocationStore();

  const isTripActive =
    !!activeTrip?.id &&
    activeTrip.status !== 'completed' &&
    activeTrip.status !== 'cancelled' &&
    activeTrip.status !== 'draft';

  const activeTripId = isTripActive ? activeTrip.id : null;

  // Sliding window of recent readings for event detection
  const readingsHistoryRef = useRef<LocationReading[]>([]);
  // State for stop/sharp_turn event detection
  const detectorStateRef = useRef<TelemetryDetectorState>({
    ...initialTelemetryDetectorState,
  });

  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Keep activeTripId in ref for interval tick
  const activeTripIdRef = useRef<string | null>(activeTripId);
  useEffect(() => {
    activeTripIdRef.current = activeTripId;
  }, [activeTripId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!activeTripId) {
      // Clear interval and state if there is no active trip
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      readingsHistoryRef.current = [];
      detectorStateRef.current = { ...initialTelemetryDetectorState };
      return;
    }

    // Ensure location watching is active while on a trip
    void watchLocation();

    const emitTelemetryPing = (): void => {
      if (!isMountedRef.current) return;

      const currentReading = useLocationStore.getState().lastKnownReading;
      const { emittedPayload, updatedHistory, nextDetectorState } = processTelemetryTick(
        currentReading,
        readingsHistoryRef.current,
        detectorStateRef.current,
        config,
        activeTripIdRef.current,
        socket.connected,
      );

      readingsHistoryRef.current = updatedHistory;
      detectorStateRef.current = nextDetectorState;

      if (emittedPayload) {
        socket.emit('driver:location_update', emittedPayload);
      }
    };

    const startInterval = (): void => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      intervalIdRef.current = setInterval(emitTelemetryPing, config.pingIntervalMs);
    };

    const stopInterval = (): void => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };

    // Immediate ping upon starting active trip tracking
    emitTelemetryPing();
    startInterval();

    // Reconnection handling: ensure ride room is joined and send fresh ping immediately
    const handleSocketConnect = (): void => {
      if (activeTripIdRef.current && socket.connected) {
        socket.emit('ride:join', { rideId: activeTripIdRef.current });
        emitTelemetryPing();
      }
    };

    // AppState handling: manage timers cleanly across background/foreground cycles
    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      appStateRef.current = nextAppState;
      if (nextAppState === 'active') {
        if (!intervalIdRef.current && activeTripIdRef.current) {
          emitTelemetryPing();
          startInterval();
        }
      } else {
        // App backgrounded: keep timer safe and prevent interval accumulation
        stopInterval();
      }
    };

    socket.on('connect', handleSocketConnect);
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopInterval();
      socket.off('connect', handleSocketConnect);
      appStateSub.remove();
    };
  }, [activeTripId, config, watchLocation]);
};
