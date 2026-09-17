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
  setSession: (data: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  clearSession: () => void;
}

const stored = localStorage.getItem('isp_session');
const initial = stored ? JSON.parse(stored) : { accessToken: null, refreshToken: null, user: null };

export const useAuthStore = create<AuthState>((set) => ({
  ...initial,
  setSession: (data) => {
    localStorage.setItem('isp_session', JSON.stringify(data));
    set(data);
  },
  clearSession: () => {
    localStorage.removeItem('isp_session');
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
