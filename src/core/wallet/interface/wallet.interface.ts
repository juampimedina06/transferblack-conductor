export interface PayoutRequestResponseDto {
  id: string;
  driver_id: string;
  amount: string;
  currency: string;
  status: 'requested' | 'approved' | 'paid' | 'rejected';
  requested_at: string;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  rejection_reason: string | null;
  transfer_reference: string | null;
}

export interface WalletSummaryResponseDto {
  currency: string;
  balance: string;
  breakdown: {
    trip_earnings: string;
    cash_commission_debt: string;
    refunds: string;
    settlements: string;
    adjustments: string;
    paid_out: string;
  };
  pending_payout: PayoutRequestResponseDto | null;
  debt_limit: string;
  can_accept_trips: boolean;
  is_cash_restricted: boolean;
  last_entry_at: string | null;
  earningsToday: string;
  completedTripsToday: number;
  acceptanceRate: number;
  cancellationRate: number;
  rating: string | number;
}

export type LedgerEntryType =
  | 'trip_earning'
  | 'trip_commission_debt'
  | 'trip_refund'
  | 'trip_chargeback'
  | 'payout'
  | 'debt_settlement'
  | 'manual_adjustment'
  | 'cancellation_penalty'
  | 'cancellation_compensation'
  | 'passenger_debt_settlement';

export interface WalletTransactionItemDto {
  id: string;
  entry_group_id: string;
  entry_type: LedgerEntryType;
  amount: string;
  currency: string;
  trip_id: string | null;
  payment_id: string | null;
  payout_request_id: string | null;
  commission_percent: string | null;
  notes: string | null;
  created_at: string;
}

export interface WalletTransactionsResponseDto {
  transactions: WalletTransactionItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
