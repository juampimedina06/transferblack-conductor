import { transferApi } from '../../api/transferApi';
import type { WalletSummaryResponseDto } from '../interface/wallet.interface';
import axios from 'axios';

export const getWalletSummary = async (): Promise<WalletSummaryResponseDto> => {
  try {
    const response = await transferApi.get<{ data: WalletSummaryResponseDto }>('/driver/wallet');
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error?.message || error.response.data.error);
    }
    throw new Error('Error al obtener los datos de la billetera');
  }
};

export const requestPayout = async (amount: number | string): Promise<void> => {
  try {
    const formattedAmount = typeof amount === 'number' ? amount.toFixed(2) : parseFloat(amount).toFixed(2);
    await transferApi.post('/driver/wallet/payouts', { amount: formattedAmount });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error?.message || 'Error al solicitar el retiro');
    }
    throw new Error('Error al procesar la solicitud de retiro');
  }
};

export const getWalletTransactions = async (page = 1, limit = 20) => {
  try {
    const response = await transferApi.get<{ data: { transactions: import('../interface/wallet.interface').WalletTransactionItemDto[]; pagination: any } }>(
      '/driver/wallet/transactions',
      { params: { page, limit } }
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error?.message || 'Error al obtener los movimientos');
    }
    throw new Error('Error al consultar los movimientos de la billetera');
  }
};
