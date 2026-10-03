import { create } from 'zustand';

export interface ForgotPasswordState {
  email: string;
  resetToken: string | null;
  expiresIn: number | null;
  setEmail: (email: string) => void;
  setResetToken: (token: string, expiresIn?: number) => void;
  clear: () => void;
}

export const useForgotPasswordStore = create<ForgotPasswordState>((set) => ({
  email: '',
  resetToken: null,
  expiresIn: null,

  setEmail: (email: string) => {
    set({ email: email.trim().toLowerCase() });
  },

  setResetToken: (token: string, expiresIn?: number) => {
    set({
      resetToken: token,
      expiresIn: expiresIn ?? null,
    });
  },

  clear: () => {
    set({
      email: '',
      resetToken: null,
      expiresIn: null,
    });
  },
}));
