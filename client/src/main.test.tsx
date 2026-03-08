import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from './components/ErrorFallback.js';
import App from './App.js';

// Component that always throws — used to test ErrorBoundary catching
function ThrowingComponent(): never {
  throw new Error('deliberate test error');
}

describe('main.tsx wiring — ErrorBoundary', () => {
  it('renders without throwing when the app tree is mounted', () => {
    expect(() =>
      render(
        <StrictMode>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <App />
          </ErrorBoundary>
        </StrictMode>
      )
    ).not.toThrow();
  });

  it('shows ErrorFallback when a child component throws', () => {
    // Suppress the expected console.error from react-error-boundary
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <StrictMode>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      </StrictMode>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('deliberate test error')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders a Try again button in the error fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders App content inside the ErrorBoundary wrapper', () => {
    render(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <App />
      </ErrorBoundary>
    );

    expect(screen.getByText('ThumbRack')).toBeInTheDocument();
  });
});
