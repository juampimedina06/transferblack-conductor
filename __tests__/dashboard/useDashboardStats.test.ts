import { describe, it, expect } from 'vitest';
import { mapWalletSummaryToStats } from '../../src/presentation/hooks/dashboardStats';
import type { WalletSummaryResponseDto } from '../../src/core/wallet/interface/wallet.interface';

const buildSummary = (
  overrides: Partial<WalletSummaryResponseDto> = {},
): WalletSummaryResponseDto => ({
  currency: 'ARS',
  balance: '15000.50',
  breakdown: {
    trip_earnings: '20000',
    cash_commission_debt: '0',
    refunds: '0',
    settlements: '0',
    adjustments: '0',
    paid_out: '5000',
  },
  pending_payout: null,
  debt_limit: '0',
  can_accept_trips: true,
  is_cash_restricted: false,
  last_entry_at: null,
  earningsToday: '25000.75',
  completedTripsToday: 4,
  acceptanceRate: 92.4,
  cancellationRate: 7.6,
  rating: 4.85,
  ...overrides,
});

describe('mapWalletSummaryToStats', () => {
  it('parses the money fields that arrive as strings', () => {
    const stats = mapWalletSummaryToStats(buildSummary());

    expect(stats.balance).toBe(15000.5);
    expect(stats.earningsToday).toBe(25000.75);
  });

  it('rounds the percentage rates to whole numbers', () => {
    const stats = mapWalletSummaryToStats(buildSummary());

    expect(stats.acceptanceRate).toBe(92);
    expect(stats.cancellationRate).toBe(8);
  });

  it('parses a rating delivered as a string', () => {
    const stats = mapWalletSummaryToStats(buildSummary({ rating: '4.3' }));

    expect(stats.rating).toBe(4.3);
  });

  it('falls back to zero when a numeric field is not a number', () => {
    const stats = mapWalletSummaryToStats(
      buildSummary({ balance: 'n/a', earningsToday: '', acceptanceRate: Number.NaN }),
    );

    expect(stats.balance).toBe(0);
    expect(stats.earningsToday).toBe(0);
    expect(stats.acceptanceRate).toBe(0);
  });
});
