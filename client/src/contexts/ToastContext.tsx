import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3000;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Auto-dismiss effect — lives outside the provider to keep it testable
// ---------------------------------------------------------------------------

/**
 * Internal hook used by ToastContainer to wire auto-dismiss.
 * Not exported for general use — use `useToast` instead.
 */
export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Auto-dismiss component — wraps individual toasts
// ---------------------------------------------------------------------------

/**
 * Registers a timeout to auto-dismiss a single toast after TOAST_DURATION_MS.
 * This is a render-less helper used by ToastContainer.
 */
export function useAutoDismiss(id: string, removeToast: (id: string) => void): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [id, removeToast]);
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

export function useToast(): Pick<ToastContextValue, 'addToast'> {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return { addToast: ctx.addToast };
}
