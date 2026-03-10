import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  color?: string;
  city?: string;
  avatarUrl?: string;
  credits?: number;
  hexesOwned?: number;
  rank?: string;
  stats?: {
    totalKm?: number;
    totalRuns?: number;
    totalHexesClaimed?: number;
    totalHexesInvaded?: number;
    currentStreak?: number;
  };
  faction?: 'red' | 'blue' | 'green' | null;
  factionJoinedAt?: Date | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      updateUser: (userData) => 
        set((state) => ({ 
          user: state.user ? { ...state.user, ...userData } : null 
        })),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      setHasHydrated: (hydrated: boolean) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: 'territory-run-auth',
      onRehydrateStorage: () => {
        // Return a function that runs after hydration from localStorage
        return (state, error) => {
          if (error) {
            console.warn('[Auth] Rehydration error:', error);
            state?.logout?.();
          } else if (state) {
            // Mark hydration as complete only after successful load
            state._hasHydrated = true;
          }
        };
      },
    }
  )
);
