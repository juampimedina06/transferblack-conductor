import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractRetryAfterSeconds,
  formatRateLimitMessage,
} from '../../src/presentation/auth/hooks/useRateLimit';
import { AuthError } from '../../src/core/auth/interface/auth.interface';
import { authActions } from '../../src/core/auth/action/auth.actions';
import { transferApi } from '../../src/core/api/transferApi';

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    post: vi.fn(),
  },
}));

describe('Rate Limiting (HTTP 429) & Retry-After Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatRateLimitMessage', () => {
    it('formats singular second correctly', () => {
      expect(formatRateLimitMessage(1)).toBe(
        'Demasiados intentos. Esperá 1 segundo antes de volver a intentar'
      );
    });

    it('formats plural seconds correctly', () => {
      expect(formatRateLimitMessage(60)).toBe(
        'Demasiados intentos. Esperá 60 segundos antes de volver a intentar'
      );
    });
  });

  describe('extractRetryAfterSeconds', () => {
    it('extracts retryAfterSeconds from AuthError instance', () => {
      const authError = new AuthError(
        'Demasiados intentos',
        429,
        'RATE_LIMIT_EXCEEDED',
        { retry_after_seconds: 45 },
        45
      );

      expect(extractRetryAfterSeconds(authError)).toBe(45);
    });

    it('extracts retry-after header from raw axios 429 response', () => {
      const axiosError = {
        status: 429,
        response: {
          status: 429,
          headers: {
            'retry-after': '30',
          },
        },
      };

      expect(extractRetryAfterSeconds(axiosError)).toBe(30);
    });

    it('falls back to default seconds if 429 has no retry-after header', () => {
      const axiosError = {
        status: 429,
        response: {
          status: 429,
        },
      };

      expect(extractRetryAfterSeconds(axiosError, 60)).toBe(60);
    });

    it('returns null for non-429 errors', () => {
      const standardError = new AuthError('Credenciales incorrectas', 400, 'INVALID_CREDENTIALS');
      expect(extractRetryAfterSeconds(standardError)).toBeNull();
    });
  });

  describe('authActions rate limit parsing', () => {
    it('throws AuthError with retryAfterSeconds from Retry-After header on /auth/login', async () => {
      const axios429Error = {
        isAxiosError: true,
        response: {
          status: 429,
          headers: {
            'retry-after': '60',
          },
          data: {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Demasiados intentos de inicio de sesión.',
              details: { retry_after_seconds: 60 },
            },
          },
        },
      };

      vi.mocked(transferApi.post).mockRejectedValueOnce(axios429Error);

      try {
        await authActions.login('driver@transferblack.com', 'Password123');
        expect.unreachable('Should have thrown AuthError');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        const authErr = err as AuthError;
        expect(authErr.status).toBe(429);
        expect(authErr.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(authErr.retryAfterSeconds).toBe(60);
      }
    });

    it('throws AuthError with retryAfterSeconds on /auth/send-otp', async () => {
      const axios429Error = {
        isAxiosError: true,
        response: {
          status: 429,
          headers: {
            'retry-after': '30',
          },
          data: {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Demasiadas solicitudes de envío de código.',
              details: { retry_after_seconds: 30 },
            },
          },
        },
      };

      vi.mocked(transferApi.post).mockRejectedValueOnce(axios429Error);

      try {
        await authActions.sendOtp('driver@transferblack.com');
        expect.unreachable('Should have thrown AuthError');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        const authErr = err as AuthError;
        expect(authErr.status).toBe(429);
        expect(authErr.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(authErr.retryAfterSeconds).toBe(30);
      }
    });
  });
});
