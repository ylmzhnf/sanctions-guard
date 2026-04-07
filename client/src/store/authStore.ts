import { create } from 'zustand';
import Cookies from 'js-cookie';

interface User {
  id: number;
  email: string;
  role: 'ADMIN' | 'USER';
  username?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: Cookies.get('access_token') || null,
  user: null,
  login: (token) => {
    Cookies.set('access_token', token, { expires: 1 });
    set({ token });
  },
  setUser: (user) => {
    set({ user });
  },
  logout: () => {
    Cookies.remove('access_token');
    set({ token: null, user: null });
  },
}));