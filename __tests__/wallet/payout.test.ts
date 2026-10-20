import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  IMMEDIATE_PAYOUT_FEE,
  MIN_IMMEDIATE_PAYOUT_AMOUNT,
  getNormalizedPayoutStatusMeta,
  isArgentinaOutsideOperatingHours,
} from '../../src/core/wallet/utils/wallet.utils';
import { requestPayout } from '../../src/core/wallet/actions/wallet.actions';
import { transferApi } from '../../src/core/api/transferApi';

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    post: vi.fn(),
  },
}));

describe('Wallet Payout Business Rules & Utils', () => {
  describe('Constants & Thresholds', () => {
    it('defines immediate payout fee as $500 ARS', () => {
      expect(IMMEDIATE_PAYOUT_FEE).toBe(500);
    });

    it('defines minimum immediate payout threshold as $500 ARS', () => {
      expect(MIN_IMMEDIATE_PAYOUT_AMOUNT).toBe(500);
    });
  });

  describe('isArgentinaOutsideOperatingHours (08:00 - 20:00 ARG / UTC-3)', () => {
    it('returns false during operating hours (e.g. 14:00 ARG = 17:00 UTC)', () => {
      // 14:00 in Argentina is 17:00 UTC
      const dateInHours = new Date('2026-10-20T17:00:00.000Z');
      expect(isArgentinaOutsideOperatingHours(dateInHours)).toBe(false);
    });

    it('returns false right at opening hour (08:00 ARG = 11:00 UTC)', () => {
      const dateAtOpen = new Date('2026-10-20T11:00:00.000Z');
      expect(isArgentinaOutsideOperatingHours(dateAtOpen)).toBe(false);
    });

    it('returns true before opening hour (07:59 ARG = 10:59 UTC)', () => {
      const dateBeforeOpen = new Date('2026-10-20T10:59:00.000Z');
      expect(isArgentinaOutsideOperatingHours(dateBeforeOpen)).toBe(true);
    });

    it('returns true at or after closing hour (20:00 ARG = 23:00 UTC)', () => {
      const dateAtClose = new Date('2026-10-20T23:00:00.000Z');
      expect(isArgentinaOutsideOperatingHours(dateAtClose)).toBe(true);
    });

    it('returns true late night (23:30 ARG = 02:30 next day UTC)', () => {
      const dateNight = new Date('2026-10-21T02:30:00.000Z');
      expect(isArgentinaOutsideOperatingHours(dateNight)).toBe(true);
    });
  });

  describe('getNormalizedPayoutStatusMeta', () => {
    it('normalizes pending state correctly', () => {
      const meta = getNormalizedPayoutStatusMeta('pending');
      expect(meta.label).toBe('Pendiente');
      expect(meta.sublabel).toBe('Saldo reservado');
      expect(meta.isFailed).toBe(false);
    });

    it('normalizes legacy requested state to Pendiente', () => {
      const meta = getNormalizedPayoutStatusMeta('requested');
      expect(meta.label).toBe('Pendiente');
      expect(meta.sublabel).toBe('Saldo reservado');
    });

    it('normalizes processing state correctly', () => {
      const meta = getNormalizedPayoutStatusMeta('processing');
      expect(meta.label).toBe('En procesamiento bancario');
      expect(meta.sublabel).toBe('En curso');
      expect(meta.isFailed).toBe(false);
    });

    it('normalizes legacy approved state to En procesamiento bancario', () => {
      const meta = getNormalizedPayoutStatusMeta('approved');
      expect(meta.label).toBe('En procesamiento bancario');
    });

    it('normalizes completed and paid states correctly', () => {
      const completedMeta = getNormalizedPayoutStatusMeta('completed');
      expect(completedMeta.label).toBe('Acreditado / Pagado');
      expect(completedMeta.sublabel).toBe('Completado');

      const paidMeta = getNormalizedPayoutStatusMeta('paid');
      expect(paidMeta.label).toBe('Acreditado / Pagado');
    });

    it('normalizes failed and rejected states and marks isFailed as true', () => {
      const failedMeta = getNormalizedPayoutStatusMeta('failed');
      expect(failedMeta.label).toBe('Rechazado');
      expect(failedMeta.sublabel).toBe('Saldo reintegrado');
      expect(failedMeta.isFailed).toBe(true);

      const rejectedMeta = getNormalizedPayoutStatusMeta('rejected');
      expect(rejectedMeta.label).toBe('Rechazado');
      expect(rejectedMeta.isFailed).toBe(true);
    });
  });

  describe('requestPayout action', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('sends POST /driver/payouts with default immediate type and formatted amount', async () => {
      vi.mocked(transferApi.post).mockResolvedValueOnce({
        data: {
          data: {
            id: 'payout-123',
            amount: '1500.00',
            fee_amount: '500.00',
            net_amount: '1000.00',
            status: 'pending',
            type: 'immediate',
          },
        },
      } as any);

      const result = await requestPayout(1500);

      expect(transferApi.post).toHaveBeenCalledWith('/driver/payouts', {
        amount: '1500.00',
        type: 'immediate',
      });
      expect(result.id).toBe('payout-123');
      expect(result.net_amount).toBe('1000.00');
    });

    it('supports weekly payout type when explicitly specified', async () => {
      vi.mocked(transferApi.post).mockResolvedValueOnce({
        data: {
          data: {
            id: 'payout-456',
            amount: '3000.00',
            fee_amount: '0.00',
            net_amount: '3000.00',
            status: 'pending',
            type: 'weekly',
          },
        },
      } as any);

      await requestPayout(3000, 'weekly');

      expect(transferApi.post).toHaveBeenCalledWith('/driver/payouts', {
        amount: '3000.00',
        type: 'weekly',
      });
    });
  });
});
