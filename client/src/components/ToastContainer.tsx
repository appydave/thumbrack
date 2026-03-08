import { useAutoDismiss, useToastContext, type Toast, type ToastType } from '../contexts/ToastContext.js';

function toastClass(type: ToastType): string {
  return `toast ${type}`;
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useAutoDismiss(toast.id, onRemove);

  return (
    <div
      data-testid={`toast-${toast.id}`}
      className={toastClass(toast.type)}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastContext();

  return (
    <div
      data-testid="toast-container"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

export default ToastContainer;
