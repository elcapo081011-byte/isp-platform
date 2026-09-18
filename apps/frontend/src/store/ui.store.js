import { create } from 'zustand';
const ACCENT_PRESETS = {
    teal: { DEFAULT: '#1FB6A6', dim: '#164F49' },
    indigo: { DEFAULT: '#6366F1', dim: '#2A2A6B' },
    amber: { DEFAULT: '#E8A23D', dim: '#5A3F17' },
    rose: { DEFAULT: '#E1554F', dim: '#5A211E' },
};
function applyAccent(accent) {
    const preset = ACCENT_PRESETS[accent];
    const root = document.documentElement;
    root.style.setProperty('--signal', preset.DEFAULT);
    root.style.setProperty('--signal-dim', preset.dim);
}
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}
const storedCollapsed = localStorage.getItem('isp_sidebar_collapsed') === '1';
const storedAccent = localStorage.getItem('isp_accent') || 'teal';
const storedTheme = localStorage.getItem('isp_theme') || 'dark';
applyAccent(storedAccent);
applyTheme(storedTheme);
export const useUIStore = create((set, get) => ({
    sidebarCollapsed: storedCollapsed,
    toggleSidebar: () => {
        const next = !get().sidebarCollapsed;
        localStorage.setItem('isp_sidebar_collapsed', next ? '1' : '0');
        set({ sidebarCollapsed: next });
    },
    accent: storedAccent,
    setAccent: (accent) => {
        localStorage.setItem('isp_accent', accent);
        applyAccent(accent);
        set({ accent });
    },
    theme: storedTheme,
    setTheme: (theme) => {
        localStorage.setItem('isp_theme', theme);
        applyTheme(theme);
        set({ theme });
    },
}));
export const ACCENT_OPTIONS = [
    { key: 'teal', label: 'Verde señal (por defecto)' },
    { key: 'indigo', label: 'Índigo' },
    { key: 'amber', label: 'Ámbar' },
    { key: 'rose', label: 'Rojo coral' },
];
