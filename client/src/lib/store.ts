
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { User } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      setAuth: (user, token) => {
        
        Cookies.set('access_token', token, { expires: 7, sameSite: 'lax' });
        localStorage.setItem('sg_token', token);
        set({ user, token });
      },

      logout: () => {
        Cookies.remove('access_token');
        localStorage.removeItem('sg_token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'sg-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);