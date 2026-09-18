import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: 'sm' | 'md';
}

export function Drawer({ title, subtitle, onClose, children, width = 'sm' }: DrawerProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`drawer-enter w-full ${width === 'md' ? 'max-w-md' : 'max-w-sm'} h-full bg-surface border-l border-border overflow-y-auto`}
      >
        <div className="sticky top-0 glass border-b border-border px-5 py-4 flex items-start justify-between z-10">
          <div className="min-w-0">
            <p className="font-display font-bold truncate">{title}</p>
            {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink p-1 -mr-1 shrink-0" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
