import { create } from 'zustand';
import { UserProfile, AuthResponse, UserProfileResponse } from '../../../core/auth/interface/auth.interface';
import { authStorage } from './authStorage';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setSession: (authData: AuthResponse) => Promise<void>;
  updateUser: (userData: UserProfileResponse) => void;
  markEmailAsVerified: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  setSession: async (authData: AuthResponse) => {
    const { profile, tokens } = authData.data;

    await authStorage.setTokens(tokens.access_token, tokens.refresh_token);
    
    set({
      user: profile,
      isAuthenticated: true,
    });
  },

  updateUser: (userData: UserProfileResponse) => {
    set({ user: userData.data });
  },

  markEmailAsVerified: () => {
    set((state) => ({
      user: state.user ? { ...state.user, email_verified_at: new Date().toISOString() } : null,
    }));
  },

  logout: async () => {
    await authStorage.removeTokens();
    set({
      user: null,
      isAuthenticated: false,
    });
  }
}));
