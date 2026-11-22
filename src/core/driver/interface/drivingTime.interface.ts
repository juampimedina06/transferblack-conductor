export interface DrivingTimeStatus {
  accumulatedSeconds: number;
  maxSeconds: number;
  remainingSeconds: number;
  isLockedForRest: boolean;
  restUntil: string | null;
  mandatoryRestSeconds: number;
  sessionStartedAt: string | null;
}

export interface DrivingTimeApiResponse {
  status: string;
  data: DrivingTimeStatus;
}

export interface DrivingTimeWarningPayload {
  remainingMinutes: number;
  accumulatedSeconds: number;
  maxSeconds: number;
}

export interface FatigueLockPayload {
  restUntil: string;
  accumulatedSeconds: number;
  maxSeconds: number;
}

export function formatDrivingDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} m`;
}
