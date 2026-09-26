export interface WalletSummaryResponseDto {
  currency: string;
  balance: string;
  breakdown: {
    trips: string;
    tips: string;
    adjustments: string;
    payouts: string;
  };
  pending_payout: string;
  debt_limit: string;
  can_accept_trips: boolean;
  last_entry_at: string | null;
  earningsToday: string;
  completedTripsToday: number;
  acceptanceRate: number;
  cancellationRate: number;
  rating: number;
}
