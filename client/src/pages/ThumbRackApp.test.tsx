import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FolderProvider } from '../contexts/FolderContext.js';
import { ToastProvider } from '../contexts/ToastContext.js';
import { ToastContainer } from '../components/ToastContainer.js';
import ThumbRackApp from './ThumbRackApp.js';
import type { FolderResponse } from '@appystack/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderApp() {
  return render(
    <ToastProvider>
      <FolderProvider>
        <ThumbRackApp />
        <ToastContainer />
      </FolderProvider>
    </ToastProvider>
  );
}

function envelope<T>(data: T) {
  return { status: 'ok', data, timestamp: new Date().toISOString() };
}

function makeFolderResponse(overrides?: Partial<FolderResponse>): FolderResponse {
  return {
    dir: '/test/folder',
    sorted: [],
    unsorted: [],
    excluded: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThumbRackApp — static structure', () => {
  it('renders the directory path input', () => {
    renderApp();
    expect(screen.getByRole('textbox', { name: /directory path/i })).toBeInTheDocument();
  });

  it('renders the Load button', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
  });

  it('renders the ThumbRack brand name in the header', () => {
    renderApp();
    expect(screen.getByText('ThumbRack')).toBeInTheDocument();
  });

  it('renders the Regenerate button', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /regenerate manifest/i })).toBeInTheDocument();
  });
});

describe('ThumbRackApp — empty state', () => {
  it('shows the empty state when no folder is loaded', () => {
    renderApp();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});

describe('ThumbRackApp — Regenerate button', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('is disabled when no folder is loaded', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /regenerate manifest/i })).toBeDisabled();
  });

  it('calls regenerateManifest and reload on click, then shows success toast', async () => {
    // First call: loadFolder
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(envelope(makeFolderResponse())), { status: 200 })
    );
    // Second call: regenerateManifest POST
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify(envelope({ success: true, manifest: { lastViewed: null } })),
        { status: 200 }
      )
    );
    // Third call: reload (fetchFolder again)
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(envelope(makeFolderResponse())), { status: 200 })
    );

    const user = userEvent.setup();
    renderApp();

    // Load a folder first so dir is set
    const input = screen.getByRole('textbox', { name: /directory path/i });
    await user.type(input, '/test/folder');
    await user.click(screen.getByRole('button', { name: /load/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /regenerate manifest/i })).not.toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: /regenerate manifest/i }));

    await waitFor(() => {
      expect(screen.getByText('Manifest regenerated')).toBeInTheDocument();
    });
  });

  it('shows an error toast when regenerateManifest fails', async () => {
    // First call: loadFolder
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(envelope(makeFolderResponse())), { status: 200 })
    );
    // Second call: regenerateManifest POST — simulate server error
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
    );

    const user = userEvent.setup();
    renderApp();

    const input = screen.getByRole('textbox', { name: /directory path/i });
    await user.type(input, '/test/folder');
    await user.click(screen.getByRole('button', { name: /load/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /regenerate manifest/i })).not.toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: /regenerate manifest/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to regenerate manifest')).toBeInTheDocument();
    });
  });
});

describe('ThumbRackApp — loading state', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('shows loading state while fetching', async () => {
    // Never resolve so we can observe the loading state
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    renderApp();

    const input = screen.getByRole('textbox', { name: /directory path/i });
    await user.type(input, '/some/folder');
    await user.click(screen.getByRole('button', { name: /load/i }));

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('Load button is disabled while fetching', async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    renderApp();

    const input = screen.getByRole('textbox', { name: /directory path/i });
    await user.type(input, '/some/folder');
    await user.click(screen.getByRole('button', { name: /load/i }));

    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });
});

describe('ThumbRackApp — error state', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('shows an error message when the load fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Folder not found' }), { status: 404 })
    );

    const user = userEvent.setup();
    renderApp();

    const input = screen.getByRole('textbox', { name: /directory path/i });
    await user.type(input, '/bad/folder');
    await user.click(screen.getByRole('button', { name: /load/i }));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
  });
});

describe('ThumbRackApp — success state', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('shows the sorted and unsorted panes after a successful load', async () => {
    const response = makeFolderResponse({
      sorted: [
        {
          filename: '01-hero.png',
          path: '/test/folder/01-hero.png',
          number: 1,
          label: 'hero.png',
          encodedPath: 'abc123',
        },
      ],
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(envelope(response)), { status: 200 })
    );

    const user = userEvent.setup();
    renderApp();

    const input = screen.getByRole('textbox', { name: /directory path/i });
    await user.type(input, '/test/folder');
    await user.click(screen.getByRole('button', { name: /load/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sorted-pane')).toBeInTheDocument();
    });
    expect(screen.getByTestId('unsorted-pane')).toBeInTheDocument();
  });
});
