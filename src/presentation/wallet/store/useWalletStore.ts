import { create } from 'zustand';
import { getWalletSummary, getWalletTransactions, requestPayout } from '../../../core/wallet/actions/wallet.actions';
import type { WalletSummaryResponseDto, WalletTransactionItemDto } from '../../../core/wallet/interface/wallet.interface';

interface WalletState {
  summary: WalletSummaryResponseDto | null;
  transactions: WalletTransactionItemDto[];
  isLoading: boolean;
  isLoadingTransactions: boolean;
  error: string | null;
  fetchSummary: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  submitPayout: (amount: number) => Promise<void>;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  summary: null,
  transactions: [],
  isLoading: false,
  isLoadingTransactions: false,
  error: null,

  fetchSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await getWalletSummary();
      set({ summary, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido al obtener la bóveda', 
        isLoading: false 
      });
    }
  },

  fetchTransactions: async () => {
    set({ isLoadingTransactions: true });
    try {
      const data = await getWalletTransactions(1, 20);
      set({ transactions: data.transactions, isLoadingTransactions: false });
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      set({ isLoadingTransactions: false });
    }
  },

  submitPayout: async (amount: number) => {
    set({ isLoading: true, error: null });
    try {
      await requestPayout(amount);
      // Refresh summary and transactions after successful payout request
      const [summary, txData] = await Promise.all([
        getWalletSummary(),
        getWalletTransactions(1, 20).catch(() => ({ transactions: [] })),
      ]);
      set({ summary, transactions: txData.transactions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error al solicitar el retiro', 
        isLoading: false 
      });
      throw error;
    }
  },

  clearWallet: () => {
    set({ summary: null, transactions: [], error: null, isLoading: false, isLoadingTransactions: false });
  }
}));
