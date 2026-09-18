import { create } from 'zustand';
const STORAGE_KEY = 'isp_session';
const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
const initial = stored ? JSON.parse(stored) : { accessToken: null, refreshToken: null, user: null };
export const useAuthStore = create((set) => ({
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
