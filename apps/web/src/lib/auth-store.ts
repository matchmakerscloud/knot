import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  emailVerifiedAt: string | null;
  status: string;
  locale: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setSession: (session: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: false,
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'knot.auth',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : (undefined as never))),
      // Only persist refresh token + user; access token is short-lived and stays in memory only.
      partialize: (state) => ({ refreshToken: state.refreshToken, user: state.user }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
