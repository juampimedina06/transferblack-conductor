import { create } from 'zustand';
import * as Haptics from 'expo-haptics';

export type BannerNotificationType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'trip'
  | 'chat';

export interface BannerNotificationInput {
  type: BannerNotificationType;
  title: string;
  message?: string;
  durationMs?: number;
  actionLabel?: string;
  onPress?: () => void;
}

export interface BannerNotificationItem extends BannerNotificationInput {
  id: string;
  durationMs: number;
}

interface BannerNotificationStoreState {
  current: BannerNotificationItem | null;
  queue: BannerNotificationItem[];
  modalHostCount: number;
  show: (input: BannerNotificationInput) => void;
  dismissCurrent: () => void;
  clearAll: () => void;
  registerModalHost: () => void;
  unregisterModalHost: () => void;
}

let bannerSeq = 0;

function triggerHapticForType(type: BannerNotificationType): void {
  try {
    if (type === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'error') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === 'warning') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics no disponibles en algunos dispositivos o simuladores
  }
}

export const useBannerNotificationStore = create<BannerNotificationStoreState>((set, get) => ({
  current: null,
  queue: [],
  modalHostCount: 0,

  show: (input) => {
    const defaultDuration = input.type === 'error' || input.type === 'warning' ? 4600 : 3600;
    const item: BannerNotificationItem = {
      ...input,
      id: `banner-${Date.now()}-${++bannerSeq}`,
      durationMs: input.durationMs ?? defaultDuration,
    };

    const { current, queue } = get();
    // Evitar duplicar exactamente el mismo aviso consecutivo
    if (current && current.title === item.title && current.message === item.message) {
      return;
    }

    triggerHapticForType(item.type);

    if (!current) {
      set({ current: item });
    } else {
      set({ queue: [...queue.slice(-3), item] });
    }
  },

  dismissCurrent: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ current: next, queue: rest });
    } else {
      set({ current: null });
    }
  },

  clearAll: () => {
    set({ current: null, queue: [] });
  },

  registerModalHost: () => {
    set((state) => ({ modalHostCount: state.modalHostCount + 1 }));
  },

  unregisterModalHost: () => {
    set((state) => ({ modalHostCount: Math.max(0, state.modalHostCount - 1) }));
  },
}));

/**
 * Muestra un banner flotante superior estilo Instagram desde cualquier pantalla, hook o servicio.
 */
export function showBannerNotification(input: BannerNotificationInput): void {
  useBannerNotificationStore.getState().show(input);
}
