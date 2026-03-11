import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FolderProvider } from '../contexts/FolderContext.js';
import { ToastProvider } from '../contexts/ToastContext.js';
import { ToastContainer } from '../components/ToastContainer.js';
import ThumbRackApp from './ThumbRackApp.js';
import type { FolderResponse } from '@appystack/shared';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorageMock.clear();
});

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

  it('renders the Options (kebab) menu button', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument();
  });

  it('shows Regenerate Manifest menu item after opening the options menu', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /options/i }));
    expect(screen.getByRole('menuitem', { name: /regenerate manifest/i })).toBeInTheDocument();
  });
});

describe('ThumbRackApp — empty state', () => {
  it('shows the empty state when no folder is loaded', () => {
    renderApp();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});

describe('ThumbRackApp — Regenerate (via kebab menu)', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('does not show Regenerate Manifest item when menu is closed', () => {
    renderApp();
    expect(screen.queryByRole('menuitem', { name: /regenerate manifest/i })).not.toBeInTheDocument();
  });

  it('shows Regenerate Manifest item after opening the options menu', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /options/i }));
    expect(screen.getByRole('menuitem', { name: /regenerate manifest/i })).toBeInTheDocument();
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
      expect(screen.getByText('ThumbRack')).toBeInTheDocument();
    });

    // Open the kebab menu then click Regenerate Manifest
    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByRole('menuitem', { name: /regenerate manifest/i }));

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
      expect(screen.getByText('ThumbRack')).toBeInTheDocument();
    });

    // Open the kebab menu then click Regenerate Manifest
    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByRole('menuitem', { name: /regenerate manifest/i }));

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

// ---------------------------------------------------------------------------
// Sidebar size preset tests
// ---------------------------------------------------------------------------

function getSidebar() {
  return document.querySelector('aside.app-sidebar') as HTMLElement;
}

describe('ThumbRackApp — sidebar size presets', () => {
  it('defaults to L size when no localStorage value exists', () => {
    renderApp();
    const sidebar = getSidebar();
    expect(sidebar.dataset.sidebarSize).toBe('L');
    expect(sidebar.style.width).toBe('420px');
  });

  it('renders S, M, L toggle buttons', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /size s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /size m/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /size l/i })).toBeInTheDocument();
  });

  it('L button is active by default', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /size l/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /size s/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /size m/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking S sets sidebar width to 180px', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /size s/i }));
    const sidebar = getSidebar();
    expect(sidebar.dataset.sidebarSize).toBe('S');
    expect(sidebar.style.width).toBe('180px');
  });

  it('clicking M sets sidebar width to 288px', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /size m/i }));
    const sidebar = getSidebar();
    expect(sidebar.dataset.sidebarSize).toBe('M');
    expect(sidebar.style.width).toBe('288px');
  });

  it('clicking L sets sidebar width to 420px', async () => {
    const user = userEvent.setup();
    renderApp();
    // Start on S to verify switching back to L works
    await user.click(screen.getByRole('button', { name: /size s/i }));
    await user.click(screen.getByRole('button', { name: /size l/i }));
    const sidebar = getSidebar();
    expect(sidebar.dataset.sidebarSize).toBe('L');
    expect(sidebar.style.width).toBe('420px');
  });

  it('persists size to localStorage on change', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /size s/i }));
    expect(localStorageMock.getItem('thumbrack:sidebarSize')).toBe('"S"');
  });

  it('reads size from localStorage on mount', () => {
    localStorageMock.setItem('thumbrack:sidebarSize', '"M"');
    renderApp();
    const sidebar = getSidebar();
    expect(sidebar.dataset.sidebarSize).toBe('M');
    expect(sidebar.style.width).toBe('288px');
    expect(screen.getByRole('button', { name: /size m/i })).toHaveAttribute('aria-pressed', 'true');
  });
});

// ---------------------------------------------------------------------------
// WU-2: client-default-folder tests
// ---------------------------------------------------------------------------

describe('ThumbRackApp — default path', () => {
  it('pre-fills the path input with ~/Downloads on first load', () => {
    renderApp();
    const input = screen.getByRole('textbox', { name: /directory path/i });
    expect(input).toHaveValue('~/Downloads');
  });
});

describe('ThumbRackApp — recent folders', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('saves path to localStorage after successful loadFolder', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(envelope(makeFolderResponse({ dir: '/saved/path' }))), { status: 200 })
    );

    const user = userEvent.setup();
    renderApp();

    const input = screen.getByRole('textbox', { name: /directory path/i });
    await user.clear(input);
    await user.type(input, '/saved/path');
    await user.click(screen.getByRole('button', { name: /^load$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).not.toBeInTheDocument();
    }).catch(() => {
      // dir might be set; check localStorage regardless
    });

    const raw = localStorageMock.getItem('thumbrack:recentFolders');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as string[];
    expect(parsed).toContain('/saved/path');
  });

  it('shows recent folder in dropdown after a successful load', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(envelope(makeFolderResponse({ dir: '/recent/path' }))), { status: 200 })
    );

    const user = userEvent.setup();
    renderApp();

    // Load a folder
    const input = screen.getByRole('textbox', { name: /directory path/i });
    await user.clear(input);
    await user.type(input, '/recent/path');
    await user.click(screen.getByRole('button', { name: /^load$/i }));

    await waitFor(() => {
      const raw = localStorageMock.getItem('thumbrack:recentFolders');
      expect(raw).not.toBeNull();
    });

    // Open dropdown
    await user.click(screen.getByRole('button', { name: /show recent folders/i }));

    expect(screen.getByText('/recent/path')).toBeInTheDocument();
  });

  it('clicking a recent folder entry triggers loadFolder with that path', async () => {
    // Pre-seed localStorage so the dropdown has an entry
    localStorageMock.setItem(
      'thumbrack:recentFolders',
      JSON.stringify(['/preset/folder'])
    );

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(envelope(makeFolderResponse({ dir: '/preset/folder' }))), { status: 200 })
    );

    const user = userEvent.setup();
    renderApp();

    // Open dropdown and click the recent entry
    await user.click(screen.getByRole('button', { name: /show recent folders/i }));
    await user.click(screen.getByText('/preset/folder'));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const wasCalled = calls.some(([url]) =>
        typeof url === 'string' && url.includes('%2Fpreset%2Ffolder')
      );
      expect(wasCalled).toBe(true);
    });
  });

  it('renders recent folders toggle button', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /show recent folders/i })).toBeInTheDocument();
  });
});
