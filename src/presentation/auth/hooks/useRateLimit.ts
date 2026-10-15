import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthError } from '../../../core/auth/interface/auth.interface';

export interface UseRateLimitReturn {
  secondsLeft: number;
  isRateLimited: boolean;
  rateLimitMessage: string | null;
  startRateLimit: (seconds: number, customMessage?: string) => void;
  clearRateLimit: () => void;
  handleRateLimitError: (error: unknown, fallbackSeconds?: number) => boolean;
}

/**
 * Formatea el mensaje amigable de bloqueo para el usuario.
 */
export function formatRateLimitMessage(seconds: number): string {
  return `Demasiados intentos. Esperá ${seconds} ${
    seconds === 1 ? 'segundo' : 'segundos'
  } antes de volver a intentar`;
}

/**
 * Extrae los segundos de espera indicados por Retry-After o el cuerpo del error 429.
 */
export function extractRetryAfterSeconds(error: unknown, fallbackSeconds = 60): number | null {
  if (error instanceof AuthError) {
    if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
      const retry =
        error.retryAfterSeconds ??
        error.details?.retry_after_seconds ??
        fallbackSeconds;
      return Number(retry) || fallbackSeconds;
    }
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    const response = errObj.response as Record<string, unknown> | undefined;
    const status = (errObj.status as number | undefined) ?? (response?.status as number | undefined);

    if (status === 429) {
      const retryAfterFromProp = errObj.retryAfterSeconds as number | undefined;
      const headers = response?.headers as Record<string, unknown> | undefined;
      const headerRetry = headers?.['retry-after'] ?? headers?.['Retry-After'];
      const parsedHeader = headerRetry ? parseInt(String(headerRetry), 10) : NaN;

      const retry =
        retryAfterFromProp ??
        (!isNaN(parsedHeader) && parsedHeader > 0 ? parsedHeader : fallbackSeconds);

      return Number(retry) || fallbackSeconds;
    }
  }

  return null;
}

/**
 * Hook para gestionar el bloqueo temporal por Rate Limiting (HTTP 429)
 * y cuenta regresiva de Retry-After en segundos.
 */
export function useRateLimit(initialSeconds = 0): UseRateLimitReturn {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearRateLimit = useCallback((): void => {
    clearTimer();
    setSecondsLeft(0);
    setCustomMessage(null);
  }, [clearTimer]);

  const startRateLimit = useCallback(
    (seconds: number, message?: string): void => {
      const validSeconds = Math.max(1, Math.ceil(seconds));
      clearTimer();
      setSecondsLeft(validSeconds);
      setCustomMessage(message ?? null);
    },
    [clearTimer]
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      clearTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimer();
    };
  }, [secondsLeft, clearTimer]);

  const handleRateLimitError = useCallback(
    (error: unknown, fallbackSeconds = 60): boolean => {
      const retrySeconds = extractRetryAfterSeconds(error, fallbackSeconds);
      if (retrySeconds !== null) {
        startRateLimit(retrySeconds);
        return true;
      }
      return false;
    },
    [startRateLimit]
  );

  const isRateLimited = secondsLeft > 0;
  const rateLimitMessage = isRateLimited
    ? customMessage || formatRateLimitMessage(secondsLeft)
    : null;

  return {
    secondsLeft,
    isRateLimited,
    rateLimitMessage,
    startRateLimit,
    clearRateLimit,
    handleRateLimitError,
  };
}
