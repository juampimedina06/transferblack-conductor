import { create } from 'zustand';
import {
  getPayoutMethod,
  getPayoutsHistory,
  getWalletSummary,
  getWalletTransactions,
  requestPayout,
  savePayoutMethod,
} from '../../../core/wallet/actions/wallet.actions';
import type {
  DriverPayoutMethod,
  DriverWalletSummary,
  Pagination,
  PayoutRequestItem,
  SavePayoutMethodPayload,
  WalletTransactionItemDto,
} from '../../../core/wallet/interface/wallet.interface';

interface WalletState {
  summary: DriverWalletSummary | null;
  transactions: WalletTransactionItemDto[];
  payoutMethod: DriverPayoutMethod | null;
  payoutsHistory: PayoutRequestItem[];
  payoutsPagination: Pagination | null;

  isLoading: boolean;
  isLoadingTransactions: boolean;
  isLoadingPayoutMethod: boolean;
  isLoadingPayouts: boolean;
  isSubmittingPayout: boolean;
  isSavingPayoutMethod: boolean;

  error: string | null;
  payoutMethodError: string | null;
  payoutsError: string | null;

  fetchSummary: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchPayoutMethod: () => Promise<DriverPayoutMethod | null>;
  savePayoutMethod: (payload: SavePayoutMethodPayload) => Promise<DriverPayoutMethod>;
  fetchPayoutsHistory: (page?: number, limit?: number) => Promise<void>;
  submitPayout: (amount: number | string) => Promise<PayoutRequestItem>;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  summary: null,
  transactions: [],
  payoutMethod: null,
  payoutsHistory: [],
  payoutsPagination: null,

  isLoading: false,
  isLoadingTransactions: false,
  isLoadingPayoutMethod: false,
  isLoadingPayouts: false,
  isSubmittingPayout: false,
  isSavingPayoutMethod: false,

  error: null,
  payoutMethodError: null,
  payoutsError: null,

  fetchSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await getWalletSummary();
      set({ summary, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al obtener datos de la billetera',
        isLoading: false,
      });
    }
  },

  fetchTransactions: async () => {
    set({ isLoadingTransactions: true });
    try {
      const data = await getWalletTransactions(1, 20);
      set({ transactions: data.transactions, isLoadingTransactions: false });
    } catch {
      set({ isLoadingTransactions: false });
    }
  },

  fetchPayoutMethod: async () => {
    set({ isLoadingPayoutMethod: true, payoutMethodError: null });
    try {
      const payoutMethod = await getPayoutMethod();
      set({ payoutMethod, isLoadingPayoutMethod: false });
      return payoutMethod;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al obtener el medio de cobro';
      set({ payoutMethodError: errorMessage, isLoadingPayoutMethod: false });
      return null;
    }
  },

  savePayoutMethod: async (payload: SavePayoutMethodPayload) => {
    set({ isSavingPayoutMethod: true, payoutMethodError: null });
    try {
      const payoutMethod = await savePayoutMethod(payload);
      set({ payoutMethod, isSavingPayoutMethod: false });
      return payoutMethod;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar el medio de cobro';
      set({ payoutMethodError: errorMessage, isSavingPayoutMethod: false });
      throw error;
    }
  },

  fetchPayoutsHistory: async (page = 1, limit = 20) => {
    set({ isLoadingPayouts: true, payoutsError: null });
    try {
      const data = await getPayoutsHistory(page, limit);
      set((state) => ({
        payoutsHistory: page === 1 ? data.payouts : [...state.payoutsHistory, ...data.payouts],
        payoutsPagination: data.pagination,
        isLoadingPayouts: false,
      }));
    } catch (error) {
      set({
        payoutsError: error instanceof Error ? error.message : 'Error al consultar el historial de retiros',
        isLoadingPayouts: false,
      });
    }
  },

  submitPayout: async (amount: number | string) => {
    set({ isSubmittingPayout: true, error: null });
    try {
      const payoutItem = await requestPayout(amount);

      // Refresh wallet summary, transactions and history in parallel
      const [summaryRes, txData, payoutsData] = await Promise.allSettled([
        getWalletSummary(),
        getWalletTransactions(1, 20),
        getPayoutsHistory(1, 20),
      ]);

      set((state) => ({
        summary: summaryRes.status === 'fulfilled' ? summaryRes.value : state.summary,
        transactions: txData.status === 'fulfilled' ? txData.value.transactions : state.transactions,
        payoutsHistory: payoutsData.status === 'fulfilled' ? payoutsData.value.payouts : state.payoutsHistory,
        payoutsPagination: payoutsData.status === 'fulfilled' ? payoutsData.value.pagination : state.payoutsPagination,
        isSubmittingPayout: false,
      }));

      return payoutItem;
    } catch (error) {
      set({
        isSubmittingPayout: false,
        error: error instanceof Error ? error.message : 'Error al solicitar el retiro',
      });
      throw error;
    }
  },

  clearWallet: () => {
    set({
      summary: null,
      transactions: [],
      payoutMethod: null,
      payoutsHistory: [],
      payoutsPagination: null,
      error: null,
      payoutMethodError: null,
      payoutsError: null,
      isLoading: false,
      isLoadingTransactions: false,
      isLoadingPayoutMethod: false,
      isLoadingPayouts: false,
      isSubmittingPayout: false,
      isSavingPayoutMethod: false,
    });
  },
}));
