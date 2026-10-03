export type PayoutAccountType = 'CBU' | 'CVU';
export type PayoutRequestStatus = 'requested' | 'approved' | 'paid' | 'rejected';

export interface DriverPayoutMethod {
  id: string;
  driver_id: string;
  account_type: PayoutAccountType;
  cbu_cvu: string;
  alias: string;
  account_holder_name: string;
  account_holder_document: string;
  created_at: string;
  updated_at: string;
}

export interface SavePayoutMethodPayload {
  account_type: PayoutAccountType;
  cbu_cvu: string; // Exactamente 22 dígitos numéricos
  alias: string;   // 6 a 50 caracteres
  account_holder_name: string;     // min 2, max 150 caracteres
  account_holder_document: string; // DNI o CUIT, min 6, max 30 caracteres
}

export interface CreatePayoutPayload {
  amount: string; // Formato decimal con hasta 2 decimales. Ej: "85000.00" o "1500"
}

export interface PayoutRequestItem {
  id: string;
  driver_id: string;
  amount: string;
  currency: string;
  status: PayoutRequestStatus;
  payment_method: PayoutAccountType | null;
  destination_alias: string | null;
  destination_cbu_cvu: string | null;
  account_holder_name: string | null;
  account_holder_document: string | null;
  receipt_url: string | null;
  requested_at: string;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  rejection_reason: string | null;
  transfer_reference: string | null;
}

export type PayoutRequestResponseDto = PayoutRequestItem;

export interface DriverWalletSummary {
  currency: string;
  balance: string;             // Saldo total en ledger (puede ser negativo si hay deuda)
  available_balance: string;   // Saldo líquido disponible para retirar
  breakdown?: {
    trip_earnings: string;
    cash_commission_debt: string;
    refunds: string;
    settlements: string;
    adjustments: string;
    paid_out: string;
  };
  pending_payout: PayoutRequestItem | null;
  debt_limit: string;
  can_accept_trips: boolean;
  is_cash_restricted: boolean;
  last_entry_at: string | null;
  earningsToday: string;
  completedTripsToday: number;
  acceptanceRate: number;
  cancellationRate: number;
  rating: number;
}

export type WalletSummaryResponseDto = DriverWalletSummary;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PayoutsHistoryResponseDto {
  payouts: PayoutRequestItem[];
  pagination: Pagination;
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
  pagination: Pagination;
}

