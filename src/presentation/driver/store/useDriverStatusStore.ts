import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DriverMeStatus,
  DriverCompliance,
  DriverDocumentItem,
} from '@/core/driver/interface/driverStatus.interface';
import { getDriverStatus, getDriverDocuments } from '@/core/driver/actions/driverStatus.actions';
import { socket } from '@/core/socket/socket';
import { setOnDocumentExpiryHandler } from '@/core/api/transferApi';
import { showBannerNotification } from '@/presentation/notifications/store/useBannerNotificationStore';

interface DriverStatusState {
  consecutiveCancellations: number;
  dispatchSuspendedUntil: string | null;
  compliance: DriverCompliance;
  documents: DriverDocumentItem[];
  isLoading: boolean;

  fetchStatus: () => Promise<DriverMeStatus | null>;
  fetchDocuments: () => Promise<DriverDocumentItem[]>;
  setDispatchSuspendedUntil: (timestamp: string | null) => void;
  setConsecutiveCancellations: (count: number) => void;
  setCompliance: (compliance: Partial<DriverCompliance>) => void;
  resetDriverStatus: () => void;
  initSocketListeners: () => () => void;
}

const defaultCompliance: DriverCompliance = {
  status: 'compliant',
  nextExpiryAt: null,
  daysUntilNextExpiry: null,
  blockingDocuments: [],
};

export const useDriverStatusStore = create<DriverStatusState>()(
  persist(
    (set, get) => ({
      consecutiveCancellations: 0,
      dispatchSuspendedUntil: null,
      compliance: defaultCompliance,
      documents: [],
      isLoading: false,

      fetchStatus: async () => {
        try {
          set({ isLoading: true });
          const status = await getDriverStatus();
          set({
            consecutiveCancellations: status.consecutiveCancellations ?? 0,
            dispatchSuspendedUntil: status.dispatchSuspendedUntil ?? null,
            compliance: status.compliance || defaultCompliance,
          });
          return status;
        } catch (error) {
          console.warn('Error obteniendo estado del conductor:', error);
          return null;
        } finally {
          set({ isLoading: false });
        }
      },

      fetchDocuments: async () => {
        try {
          const docs = await getDriverDocuments();
          set({ documents: docs });
          return docs;
        } catch (error) {
          console.warn('Error obteniendo documentos del conductor:', error);
          return [];
        }
      },

      setDispatchSuspendedUntil: (timestamp) => {
        set({ dispatchSuspendedUntil: timestamp });
      },

      setConsecutiveCancellations: (count) => {
        set({ consecutiveCancellations: count });
      },

      setCompliance: (partial) => {
        set((state) => ({
          compliance: {
            ...state.compliance,
            ...partial,
          },
        }));
      },

      resetDriverStatus: () => {
        set({
          consecutiveCancellations: 0,
          dispatchSuspendedUntil: null,
          compliance: defaultCompliance,
          documents: [],
          isLoading: false,
        });
      },

      initSocketListeners: () => {
        if (!socket) return () => {};

        const handleSuspended = (payload: { dispatchSuspendedUntil?: string }) => {
          if (payload?.dispatchSuspendedUntil) {
            set({ dispatchSuspendedUntil: payload.dispatchSuspendedUntil });
            showBannerNotification({
              type: 'warning',
              title: 'Despacho pausado temporalmente',
              message: 'Tu recepción de viajes se pausó brevemente por cancelaciones consecutivas.',
              durationMs: 5200,
            });
          }
        };

        const handleComplianceChanged = (payload: {
          status?: DriverCompliance['status'];
          blockingDocuments?: string[];
        }) => {
          const previousStatus = get().compliance.status;
          if (payload?.status) {
            get().setCompliance({
              status: payload.status,
              blockingDocuments: payload.blockingDocuments || [],
            });
            const wasUnlocked =
              previousStatus === 'suspended_documents' &&
              payload.status !== 'suspended_documents';
            showBannerNotification({
              type:
                payload.status === 'compliant' || wasUnlocked
                  ? 'success'
                  : 'warning',
              title:
                payload.status === 'compliant'
                  ? 'Documentación al día'
                  : wasUnlocked
                    ? 'Cuenta habilitada para operar'
                    : 'Atención con tu documentación',
              message:
                payload.status === 'compliant'
                  ? 'Tus documentos fueron aprobados o cuentan con prórroga vigente. Ya podés operar.'
                  : wasUnlocked
                    ? 'Se actualizó el estado de tu documentación. Ya podés conectarte nuevamente.'
                    : 'Tenés documentos vencidos o próximos a vencer. Revisalos desde tu perfil.',
              durationMs: 5200,
            });
          }
          void get().fetchStatus();
          void get().fetchDocuments();
        };

        socket.on('driver:dispatch:suspended', handleSuspended);
        socket.on('driver:compliance:changed', handleComplianceChanged);

        setOnDocumentExpiryHandler(() => {
          set((state) => ({
            compliance: { ...state.compliance, status: 'suspended_documents' },
          }));
          void get().fetchStatus();
        });

        return () => {
          socket.off('driver:dispatch:suspended', handleSuspended);
          socket.off('driver:compliance:changed', handleComplianceChanged);
          setOnDocumentExpiryHandler(null);
        };
      },
    }),
    {
      name: 'driver-compliance-status-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        consecutiveCancellations: state.consecutiveCancellations,
        dispatchSuspendedUntil: state.dispatchSuspendedUntil,
        compliance: state.compliance,
      }),
    }
  )
);
