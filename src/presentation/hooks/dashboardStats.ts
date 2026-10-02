import type { WalletSummaryResponseDto } from '../../core/wallet/interface/wallet.interface';
import type { DashboardStats } from '../components/dashboard/DashboardCarousel';

export const mapWalletSummaryToStats = (data: WalletSummaryResponseDto): DashboardStats => ({
  earningsToday: parseFloat(data.earningsToday) || 0,
  completedTripsToday: Number(data.completedTripsToday) || 0,
  acceptanceRate: Math.round(Number(data.acceptanceRate)) || 0,
  cancellationRate: Math.round(Number(data.cancellationRate)) || 0,
  rating: parseFloat(data.rating as any) || 5.0,
  balance: parseFloat(data.balance) || 0,
});
