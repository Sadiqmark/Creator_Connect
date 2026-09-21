/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  duration: number;
}

export interface ToastApi {
  success: (message: string) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  dismiss: (id: string) => void;
  toast: ToastApi;
}

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 5000,
};

export const MAX_VISIBLE_TOASTS = 3;

export const ToastContext = createContext<ToastApi | null>(null);

interface ToastItemComponentProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastItemComponent: React.FC<ToastItemComponentProps> = ({ toast, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(toast.duration);

  useEffect(() => {
    if (toast.duration <= 0) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onDismiss(toast.id);
      }, remainingRef.current);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.id, toast.duration, isPaused, onDismiss]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  const handleFocus = () => setIsPaused(true);
  const handleBlur = () => setIsPaused(false);

  const isError = toast.variant === 'error';
  const isSuccess = toast.variant === 'success';

  const role = isError ? 'alert' : 'status';
  const ariaLive = isError ? 'assertive' : 'polite';

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-card backdrop-blur-sm bg-surface transition-all duration-200 motion-reduce:transition-none motion-reduce:animate-none ${
        isSuccess
          ? 'border-success/30 text-foreground'
          : isError
          ? 'border-danger/30 text-foreground'
          : 'border-accent/30 text-foreground'
      }`}
      data-testid={`toast-${toast.variant}`}
    >
      <div className="shrink-0 mt-0.5">
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />}
        {isError && <AlertCircle className="w-5 h-5 text-danger" aria-hidden="true" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-accent" aria-hidden="true" />}
      </div>
      <div className="flex-1 text-sm font-medium leading-tight">
        {toast.message}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed z-40 bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 pointer-events-none flex flex-col gap-2 max-w-sm w-auto sm:w-full"
    >
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </aside>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visibleToasts, setVisibleToasts] = useState<ToastItem[]>([]);
  const queueRef = useRef<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setVisibleToasts((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (queueRef.current.length > 0 && filtered.length < MAX_VISIBLE_TOASTS) {
        const [nextItem, ...remainingQueue] = queueRef.current;
        queueRef.current = remainingQueue;
        return [...filtered, nextItem];
      }
      return filtered;
    });
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, message: string): string => {
      const duration = DEFAULT_DURATIONS[variant];
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, variant, message, duration };

      setVisibleToasts((prev) => {
        const isDuplicateVisible = prev.some(
          (t) => t.message === message && t.variant === variant
        );
        const isDuplicateQueued = queueRef.current.some(
          (t) => t.message === message && t.variant === variant
        );
        if (isDuplicateVisible || isDuplicateQueued) {
          return prev;
        }

        if (prev.length < MAX_VISIBLE_TOASTS) {
          return [...prev, newToast];
        } else {
          queueRef.current = [...queueRef.current, newToast];
          return prev;
        }
      });

      return id;
    },
    []
  );

  const success = useCallback(
    (message: string) => addToast('success', message),
    [addToast]
  );
  const error = useCallback(
    (message: string) => addToast('error', message),
    [addToast]
  );
  const info = useCallback(
    (message: string) => addToast('info', message),
    [addToast]
  );

  const api: ToastApi = {
    success,
    error,
    info,
    dismiss,
    toast: null as any,
  };
  api.toast = api;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={visibleToasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const fallbackToastApi: ToastApi = {
  success: () => '',
  error: () => '',
  info: () => '',
  dismiss: () => {},
  toast: null as any,
};
fallbackToastApi.toast = fallbackToastApi;

export const useToast = (): ToastApi => {
  const context = useContext(ToastContext);
  return context ?? fallbackToastApi;
};
