import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../contexts/ToastContext.js';
import { ToastContainer } from './ToastContainer.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function ToastTrigger({ message, type }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const { addToast } = useToast();
  return <button onClick={() => addToast(message, type)}>Add Toast</button>;
}

function renderContainer(message = 'Test message', type?: 'success' | 'error' | 'info') {
  return render(
    <ToastProvider>
      <ToastTrigger message={message} type={type} />
      <ToastContainer />
    </ToastProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ToastContainer — rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the toast container element', () => {
    renderContainer();
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });

  it('renders a toast message when one is added', async () => {
    renderContainer('Hello toast');

    await act(async () => {
      screen.getByRole('button', { name: /add toast/i }).click();
    });

    expect(screen.getByText('Hello toast')).toBeInTheDocument();
  });

  it('applies green background class for success toasts', async () => {
    renderContainer('Done!', 'success');

    await act(async () => {
      screen.getByRole('button', { name: /add toast/i }).click();
    });

    const toastEl = screen.getByText('Done!');
    expect(toastEl.className).toContain('success');
  });

  it('applies red background class for error toasts', async () => {
    renderContainer('Oops!', 'error');

    await act(async () => {
      screen.getByRole('button', { name: /add toast/i }).click();
    });

    const toastEl = screen.getByText('Oops!');
    expect(toastEl.className).toContain('error');
  });

  it('applies slate background class for info toasts', async () => {
    renderContainer('FYI', 'info');

    await act(async () => {
      screen.getByRole('button', { name: /add toast/i }).click();
    });

    const toastEl = screen.getByText('FYI');
    expect(toastEl.className).toContain('info');
  });

  it('auto-dismisses the toast after 3000ms', async () => {
    renderContainer('Fleeting');

    await act(async () => {
      screen.getByRole('button', { name: /add toast/i }).click();
    });

    expect(screen.getByText('Fleeting')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3001);
    });

    expect(screen.queryByText('Fleeting')).not.toBeInTheDocument();
  });

  it('renders multiple toasts simultaneously', async () => {
    function MultiTrigger() {
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
        <MultiTrigger />
        <ToastContainer />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /add first/i }).click();
      screen.getByRole('button', { name: /add second/i }).click();
    });

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
