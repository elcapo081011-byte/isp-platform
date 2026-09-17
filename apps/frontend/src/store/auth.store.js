import { create } from 'zustand';
const stored = localStorage.getItem('isp_session');
const initial = stored ? JSON.parse(stored) : { accessToken: null, refreshToken: null, user: null };
export const useAuthStore = create((set) => ({
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
