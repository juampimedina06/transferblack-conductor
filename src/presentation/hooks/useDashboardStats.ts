import { useEffect, useState } from 'react';
import { getWalletSummary } from '../../core/wallet/actions/wallet.actions';
import type { DashboardStats } from '../components/dashboard/DashboardCarousel';
import { useAuthStore } from '../auth/store/useAuthStore';

export const useDashboardStats = (isAvailable: boolean) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const data = await getWalletSummary();
      setStats({
        earningsToday: parseFloat(data.earningsToday) || 0,
        completedTripsToday: data.completedTripsToday || 0,
        acceptanceRate: Math.round(data.acceptanceRate) || 0,
        cancellationRate: Math.round(data.cancellationRate) || 0,
        rating: data.rating || 5.0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  // Refetch when availability changes to online (to get latest stats after being offline)
  useEffect(() => {
    if (isAvailable && isAuthenticated) {
      fetchStats();
    }
  }, [isAvailable, isAuthenticated]);

  return { stats, isLoading, refetch: fetchStats };
};
