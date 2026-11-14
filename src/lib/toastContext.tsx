import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'warning' | 'danger' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  duration?: number; // ms
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, type = 'info', actionLabel, onAction, duration }: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      // Default duration is 8000ms if there's an action (e.g. Undo), otherwise 4000ms
      const autoDismissDuration = duration ?? (actionLabel ? 8000 : 4000);

      const newToast: ToastItem = {
        id,
        message,
        type,
        actionLabel,
        onAction,
        duration: autoDismissDuration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (autoDismissDuration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, autoDismissDuration);
      }

      return id;
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const bgColors = {
            success: 'bg-am-surface border-am-success text-am-ink',
            warning: 'bg-am-surface border-am-warning text-am-ink',
            danger: 'bg-am-surface border-am-danger text-am-ink',
            info: 'bg-am-surface border-am-border text-am-ink',
          };

          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-am-success shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-am-warning shrink-0" />,
            danger: <AlertCircle className="w-5 h-5 text-am-danger shrink-0" />,
            info: <Info className="w-5 h-5 text-am-info shrink-0" />,
          };

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-am-card border shadow-am-soft transition-all ${
                bgColors[t.type || 'info']
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {icons[t.type || 'info']}
                <p className="text-sm font-medium leading-snug break-words">{t.message}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {t.actionLabel && t.onAction && (
                  <button
                    onClick={() => {
                      t.onAction?.();
                      dismissToast(t.id);
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-am-input bg-am-sand text-am-ink hover:opacity-80 transition"
                  >
                    {t.actionLabel}
                  </button>
                )}
                <button
                  onClick={() => dismissToast(t.id)}
                  aria-label="Dismiss notification"
                  className="p-1 text-am-ink-muted hover:text-am-ink rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
