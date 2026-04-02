import { create } from 'zustand';
import Cookies from 'js-cookie';

interface AuthState {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Sayfa ilk yüklendiğinde çerezlerde token var mı diye bakar
  token: Cookies.get('access_token') || null,
  
  // Giriş yapıldığında çalışacak fonksiyon
  login: (token) => {
    // Token'ı tarayıcı çerezlerine kaydet (1 gün geçerli)
    Cookies.set('access_token', token, { expires: 1 });
    set({ token });
  },
  
  // Çıkış yapıldığında çalışacak fonksiyon
  logout: () => {
    Cookies.remove('access_token');
    set({ token: null });
  },
}));