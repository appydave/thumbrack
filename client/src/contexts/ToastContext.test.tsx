import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast, useToastContext } from './ToastContext.js';

// ---------------------------------------------------------------------------
// Helper — renders a component that can add toasts and read context
// ---------------------------------------------------------------------------

function ToastAdder({ message, type }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const { addToast } = useToast();
  return (
    <button onClick={() => addToast(message, type)}>Add Toast</button>
  );
}

function ToastList() {
  const { toasts } = useToastContext();
  return (
    <ul>
      {toasts.map((t) => (
        <li key={t.id} data-testid={`toast-item-${t.id}`} data-type={t.type}>
          {t.message}
        </li>
      ))}
    </ul>
  );
}

function renderWithProvider(message = 'Hello', type?: 'success' | 'error' | 'info') {
  return render(
    <ToastProvider>
      <ToastAdder message={message} type={type} />
      <ToastList />
    </ToastProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ToastContext — addToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast to the list when addToast is called', async () => {
    renderWithProvider('Hello world', 'success');

    const btn = screen.getByRole('button', { name: /add toast/i });
    await act(async () => {
      btn.click();
    });

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('toast defaults to type "info" when no type is provided', async () => {
    renderWithProvider('Info toast');

    const btn = screen.getByRole('button', { name: /add toast/i });
    await act(async () => {
      btn.click();
    });

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-type', 'info');
  });

  it('multiple toasts stack independently', async () => {
    function MultiAdder() {
      const { addToast } = useToast();
      return (
        <>
          <button onClick={() => addToast('First', 'success')}>Add First</button>
          <button onClick={() => addToast('Second', 'error')}>Add Second</button>
        </>
      );
    }

    render(
      <ToastProvider>
        <MultiAdder />
        <ToastList />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /add first/i }).click();
      screen.getByRole('button', { name: /add second/i }).click();
    });

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('auto-dismisses a toast after 3000ms', async () => {
    // Use a component that also renders ToastContainer-style auto-dismiss
    function AutoDismissToast() {
      const { toasts, removeToast } = useToastContext();
      // Mimic what ToastContainer does — each rendered toast registers auto-dismiss
      return (
        <ul>
          {toasts.map((t) => (
            <AutoDismissItem key={t.id} id={t.id} message={t.message} onRemove={removeToast} />
          ))}
        </ul>
      );
    }

    // Import useAutoDismiss inside this test
    const { useAutoDismiss } = await import('./ToastContext.js');

    function AutoDismissItem({
      id,
      message,
      onRemove,
    }: {
      id: string;
      message: string;
      onRemove: (id: string) => void;
    }) {
      useAutoDismiss(id, onRemove);
      return <li>{message}</li>;
    }

    render(
      <ToastProvider>
        <ToastAdder message="Temporary" type="info" />
        <AutoDismissToast />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /add toast/i }).click();
    });

    expect(screen.getByText('Temporary')).toBeInTheDocument();

    // Advance timers past 3000ms
    await act(async () => {
      vi.advanceTimersByTime(3001);
    });

    expect(screen.queryByText('Temporary')).not.toBeInTheDocument();
  });
});

describe('ToastContext — useToast outside provider', () => {
  it('throws when useToast is used outside a ToastProvider', () => {
    // Suppress React error boundary noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadComponent() {
      useToast();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    consoleSpy.mockRestore();
  });
});
