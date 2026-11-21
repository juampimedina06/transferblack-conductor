import { create } from 'zustand';

interface BackgroundLocationDisclosureState {
  visible: boolean;
  resolver: ((accepted: boolean) => void) | null;
  requestDisclosure: () => Promise<boolean>;
  resolveDisclosure: (accepted: boolean) => void;
}

export const useBackgroundLocationDisclosureStore =
  create<BackgroundLocationDisclosureState>((set, get) => ({
    visible: false,
    resolver: null,

    requestDisclosure: () => {
      const existingResolver = get().resolver;
      if (existingResolver) {
        existingResolver(false);
      }

      return new Promise<boolean>((resolve) => {
        set({
          visible: true,
          resolver: resolve,
        });
      });
    },

    resolveDisclosure: (accepted: boolean) => {
      const resolve = get().resolver;
      set({
        visible: false,
        resolver: null,
      });
      resolve?.(accepted);
    },
  }));

export const requestBackgroundLocationDisclosure = (): Promise<boolean> =>
  useBackgroundLocationDisclosureStore.getState().requestDisclosure();
