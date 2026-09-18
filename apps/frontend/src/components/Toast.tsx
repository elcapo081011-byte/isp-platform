import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'border-l-ok text-ok' },
  warning: { icon: AlertTriangle, className: 'border-l-warn text-warn' },
  error: { icon: XCircle, className: 'border-l-critical text-critical' },
  info: { icon: Info, className: 'border-l-signal text-signal' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, variant, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    warning: (m) => show(m, 'warning'),
    info: (m) => show(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map((t) => {
          const { icon: Icon, className } = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              className={`bg-surface border border-border border-l-[3px] rounded-md shadow-lg px-3.5 py-3 flex items-start gap-2.5 animate-[toast-in_0.18s_ease-out] ${className}`}
            >
              <Icon size={16} className="shrink-0 mt-0.5" />
              <p className="text-sm text-ink flex-1 leading-snug">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink shrink-0" aria-label="Cerrar notificación">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
