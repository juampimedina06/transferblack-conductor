import { transferApi } from '../../api/transferApi';
import type { WalletSummaryResponseDto } from '../interface/wallet.interface';
import axios from 'axios';

export const getWalletSummary = async (): Promise<WalletSummaryResponseDto> => {
  try {
    const { data } = await transferApi.get<WalletSummaryResponseDto>('/driver/wallet');
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error('Error al obtener los datos de la billetera');
  }
};
