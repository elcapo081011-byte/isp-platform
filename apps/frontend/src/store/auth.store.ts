import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  isPlatformAdmin?: boolean;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (data: { accessToken: string; refreshToken: string; user: AuthUser }, remember?: boolean) => void;
  clearSession: () => void;
}

const STORAGE_KEY = 'isp_session';
const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
const initial = stored ? JSON.parse(stored) : { accessToken: null, refreshToken: null, user: null };

export const useAuthStore = create<AuthState>((set) => ({
  ...initial,
  setSession: (data, remember = true) => {
    // "Recordarme": localStorage sobrevive cerrar el navegador; sessionStorage
    // se borra al cerrar la pestaña — sin dejar rastro en un equipo compartido.
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(data));
    set(data);
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
