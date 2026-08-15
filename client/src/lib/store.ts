import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { User } from './api';

export type { User } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isHydrated: false,

      setAuth: (user, token) => {
        Cookies.set('access_token', token, { expires: 7, sameSite: 'lax', path: '/' });
        localStorage.setItem('sg_token', token);
        set({ user, token });
      },

      logout: () => {
        Cookies.remove('access_token', { path: '/' });
        localStorage.removeItem('sg_token');
        set({ user: null, token: null });
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: 'sg-auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          Cookies.set('access_token', state.token, { expires: 7, sameSite: 'lax', path: '/' });
        }
        state?.setHydrated();
      },
    }
  )
);