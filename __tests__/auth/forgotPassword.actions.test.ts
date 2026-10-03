import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authActions } from '../../src/core/auth/action/auth.actions';
import { transferApi } from '../../src/core/api/transferApi';
import { AuthError } from '../../src/core/auth/interface/auth.interface';

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    post: vi.fn(),
  },
}));

describe('authActions - Forgot Password Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('calls /auth/forgot-password with trimmed lowercase email', async () => {
      const mockResponse = { data: { data: { message: 'Si el correo existe, recibirás un código' } } };
      vi.mocked(transferApi.post).mockResolvedValueOnce(mockResponse);

      const result = await authActions.forgotPassword('  Driver@TransferBlack.COM ');

      expect(transferApi.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'driver@transferblack.com',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('throws AuthError with API details if request fails with ApiErrorResponse', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Email no válido',
            },
          },
        },
      };
      vi.mocked(transferApi.post).mockRejectedValueOnce(axiosError);

      await expect(authActions.forgotPassword('invalid')).rejects.toThrow(AuthError);
    });
  });

  describe('verifyResetPasswordCode', () => {
    it('calls /auth/reset-password/verify with email and code', async () => {
      const mockResponse = {
        data: {
          data: {
            reset_token: 'valid-reset-token-xyz',
            expires_in: 900,
          },
        },
      };
      vi.mocked(transferApi.post).mockResolvedValueOnce(mockResponse);

      const result = await authActions.verifyResetPasswordCode('DRIVER@example.com ', ' 123456 ');

      expect(transferApi.post).toHaveBeenCalledWith('/auth/reset-password/verify', {
        email: 'driver@example.com',
        code: '123456',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('captures attempts_remaining in AuthError when code is incorrect', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              code: 'VERIFICATION_CODE_INVALID',
              message: 'El código no es correcto',
              details: { attempts_remaining: 2 },
            },
          },
        },
      };
      vi.mocked(transferApi.post).mockRejectedValueOnce(axiosError);

      try {
        await authActions.verifyResetPasswordCode('driver@example.com', '111111');
        expect.unreachable('Should have thrown AuthError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AuthError);
        const authErr = err as AuthError;
        expect(authErr.status).toBe(400);
        expect(authErr.code).toBe('VERIFICATION_CODE_INVALID');
        expect(authErr.details?.attempts_remaining).toBe(2);
      }
    });

    it('captures VERIFICATION_CODE_LOCKED on 429', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            error: {
              code: 'VERIFICATION_CODE_LOCKED',
              message: 'Superaste los intentos permitidos',
            },
          },
        },
      };
      vi.mocked(transferApi.post).mockRejectedValueOnce(axiosError);

      try {
        await authActions.verifyResetPasswordCode('driver@example.com', '111111');
        expect.unreachable('Should have thrown AuthError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AuthError);
        const authErr = err as AuthError;
        expect(authErr.status).toBe(429);
        expect(authErr.code).toBe('VERIFICATION_CODE_LOCKED');
      }
    });
  });

  describe('resetPassword', () => {
    it('calls /auth/reset-password with reset_token and new_password', async () => {
      const mockResponse = {
        data: {
          data: {
            message: 'Tu contraseña se actualizó.',
          },
        },
      };
      vi.mocked(transferApi.post).mockResolvedValueOnce(mockResponse);

      const result = await authActions.resetPassword('token-abc', 'NewPass1234');

      expect(transferApi.post).toHaveBeenCalledWith('/auth/reset-password', {
        reset_token: 'token-abc',
        new_password: 'NewPass1234',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('throws AuthError when token is expired or invalid', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              code: 'RESET_TOKEN_INVALID',
              message: 'El token no es válido o ya venció',
            },
          },
        },
      };
      vi.mocked(transferApi.post).mockRejectedValueOnce(axiosError);

      try {
        await authActions.resetPassword('expired-token', 'NewPass1234');
        expect.unreachable('Should have thrown AuthError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AuthError);
        const authErr = err as AuthError;
        expect(authErr.status).toBe(400);
        expect(authErr.code).toBe('RESET_TOKEN_INVALID');
      }
    });
  });
});
