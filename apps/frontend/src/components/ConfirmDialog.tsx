import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  function close(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={() => close(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-surface border border-border rounded-lg shadow-2xl p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={`shrink-0 rounded-full p-2 ${state.options.danger ? 'bg-critical/10 text-critical' : 'bg-signal/10 text-signal'}`}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="font-display font-bold">{state.options.title}</p>
                {state.options.description && <p className="text-sm text-muted mt-1">{state.options.description}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => close(false)} className="text-sm text-muted hover:text-ink px-4 py-2">
                {state.options.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                onClick={() => close(true)}
                className={`text-sm font-medium rounded-md px-4 py-2 ${
                  state.options.danger ? 'bg-critical text-white hover:opacity-90' : 'bg-signal text-base hover:opacity-90'
                }`}
              >
                {state.options.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
