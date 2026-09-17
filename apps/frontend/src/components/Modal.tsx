import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: 'md' | 'lg';
}

export function Modal({ title, subtitle, onClose, children, width = 'md' }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]">
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${width === 'lg' ? 'max-w-2xl' : 'max-w-lg'} bg-surface border border-border rounded-lg shadow-2xl`}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display font-bold text-lg">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors rounded-md p-1 -mr-1 -mt-1"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
