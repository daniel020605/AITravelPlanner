import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 简化的User类型，避免循环依赖
interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      setUser: (user: User | null) => {
        set({ user });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { authService } = await import('../services/auth/authService');
          const { user } = await authService.login(email, password);
          set({ user, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          });
        }
      },

      register: async (email: string, password: string, name?: string) => {
        set({ isLoading: true, error: null });
        try {
          const { authService } = await import('../services/auth/authService');
          const { user } = await authService.register(email, password, { name });
          set({ user, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false
          });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const { authService } = await import('../services/auth/authService');
          await authService.logout();
          set({ user: null, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Logout failed',
            isLoading: false
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);