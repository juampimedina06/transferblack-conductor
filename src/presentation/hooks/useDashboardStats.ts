import { useQuery } from '@tanstack/react-query';
import { getWalletSummary } from '../../core/wallet/actions/wallet.actions';
import { useAuthStore } from '../auth/store/useAuthStore';
import { useDriverTripStore } from '../trip/store/useDriverTripStore';
import { mapWalletSummaryToStats } from './dashboardStats';

export const useDashboardStats = (isAvailable: boolean) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const activeTripId = useDriverTripStore(state => state.activeTrip?.id ?? null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['driver', 'dashboard-stats', isAvailable, activeTripId],
    queryFn: () => getWalletSummary().then(mapWalletSummaryToStats),
    enabled: isAuthenticated,
  });

  return { stats: data ?? null, isLoading, refetch };
};
