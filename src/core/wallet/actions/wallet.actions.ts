import { isAxiosError } from 'axios';
import { transferApi } from '../../api/transferApi';
import type {
  DriverPayoutMethod,
  DriverWalletSummary,
  PayoutRequestItem,
  PayoutsHistoryResponseDto,
  SavePayoutMethodPayload,
  WalletTransactionsResponseDto,
} from '../interface/wallet.interface';

export const getWalletSummary = async (): Promise<DriverWalletSummary> => {
  try {
    const response = await transferApi.get<{ data: DriverWalletSummary }>('/driver/wallet');
    return response.data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error.message || 'Error al obtener los datos de la billetera');
    }
    throw new Error('Error de conexión al obtener los datos de la billetera');
  }
};

export const getPayoutMethod = async (): Promise<DriverPayoutMethod | null> => {
  try {
    const response = await transferApi.get<{ data: DriverPayoutMethod | null }>('/driver/payout-method');
    return response.data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error.message || 'Error al obtener el medio de cobro');
    }
    throw new Error('Error de conexión al obtener el medio de cobro');
  }
};

export const savePayoutMethod = async (
  payload: SavePayoutMethodPayload
): Promise<DriverPayoutMethod> => {
  try {
    const response = await transferApi.put<{ data: DriverPayoutMethod }>('/driver/payout-method', payload);
    return response.data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error.message || 'Error al guardar el medio de cobro');
    }
    throw new Error('Error al conectar con el servidor para guardar el medio de cobro');
  }
};

export const requestPayout = async (amount: number | string): Promise<PayoutRequestItem> => {
  try {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    const formattedAmount = numAmount.toFixed(2);

    const response = await transferApi.post<{ data: PayoutRequestItem }>('/driver/payouts', {
      amount: formattedAmount,
    });
    return response.data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      const code = error.response.data.error.code;
      const message = error.response.data.error.message;
      if (code === 'PAYOUT_METHOD_REQUIRED') {
        throw new Error(message || 'Debes configurar un medio de cobro antes de solicitar un retiro');
      }
      if (code === 'INSUFFICIENT_FUNDS') {
        throw new Error(message || 'Saldo insuficiente para solicitar el retiro');
      }
      if (code === 'OPEN_PAYOUT_REQUEST_EXISTS') {
        throw new Error(message || 'Ya tienes una solicitud de retiro abierta');
      }
      throw new Error(message || 'Error al solicitar el retiro');
    }
    throw new Error('Error al procesar la solicitud de retiro');
  }
};

export const getPayoutsHistory = async (
  page = 1,
  limit = 20
): Promise<PayoutsHistoryResponseDto> => {
  try {
    const response = await transferApi.get<{ data: PayoutsHistoryResponseDto }>('/driver/payouts', {
      params: { page, limit },
    });
    return response.data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error.message || 'Error al obtener el historial de retiros');
    }
    throw new Error('Error al consultar el historial de retiros');
  }
};

export const getWalletTransactions = async (
  page = 1,
  limit = 20
): Promise<WalletTransactionsResponseDto> => {
  try {
    const response = await transferApi.get<{ data: WalletTransactionsResponseDto }>(
      '/driver/wallet/transactions',
      { params: { page, limit } }
    );
    return response.data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error.message || 'Error al obtener los movimientos');
    }
    throw new Error('Error al consultar los movimientos de la billetera');
  }
};
