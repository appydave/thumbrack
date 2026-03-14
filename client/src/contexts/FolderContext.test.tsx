import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FolderProvider, useFolderContext } from './FolderContext.js';
import type { FolderResponse } from '@appystack/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <FolderProvider>{children}</FolderProvider>;
}

// Wrap data in the server's { status, data, timestamp } envelope
function envelope<T>(data: T) {
  return { status: 'ok', data, timestamp: new Date().toISOString() };
}

function makeFolderResponse(overrides?: Partial<FolderResponse>): FolderResponse {
  return {
    dir: '/some/folder',
    sorted: [
      {
        filename: '01-hero.png',
        path: '/some/folder/01-hero.png',
        number: 1,
        label: 'hero.png',
        encodedPath: 'L3NvbWUvZm9sZGVyLzAxLWhlcm8ucG5n',
      },
    ],
    unsorted: [
      {
        filename: 'random.png',
        path: '/some/folder/random.png',
        number: null,
        label: 'random.png',
        encodedPath: 'L3NvbWUvZm9sZGVyL3JhbmRvbS5wbmc=',
      },
    ],
    excluded: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FolderContext — loadFolder', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('sets sorted, unsorted, and excluded after a successful fetch', async () => {
    const response = makeFolderResponse();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(envelope(response)), { status: 200 })
    );

    const { result } = renderHook(() => useFolderContext(), { wrapper });

    await act(async () => {
      await result.current.loadFolder('/some/folder');
    });

    expect(result.current.dir).toBe('/some/folder');
    expect(result.current.sorted).toHaveLength(1);
    expect(result.current.sorted[0].filename).toBe('01-hero.png');
    expect(result.current.unsorted).toHaveLength(1);
    expect(result.current.unsorted[0].filename).toBe('random.png');
    expect(result.current.excluded).toHaveLength(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Folder not found' }), { status: 404 })
    );

    const { result } = renderHook(() => useFolderContext(), { wrapper });

    await act(async () => {
      await result.current.loadFolder('/no/such/folder');
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
    expect(result.current.dir).toBeNull();
  });

  it('sets loading to true while fetching and false when done', async () => {
    let resolvePromise!: (value: Response) => void;
    const pending = new Promise<Response>((res) => {
      resolvePromise = res;
    });
    vi.mocked(fetch).mockReturnValueOnce(pending);

    const { result } = renderHook(() => useFolderContext(), { wrapper });

    let loadPromise!: Promise<void>;
    act(() => {
      loadPromise = result.current.loadFolder('/some/folder');
    });

    // loading should be true while the promise is pending
    expect(result.current.loading).toBe(true);

    // resolve the fetch
    const folderData = makeFolderResponse();
    await act(async () => {
      resolvePromise(new Response(JSON.stringify(envelope(folderData)), { status: 200 }));
      await loadPromise;
    });

    expect(result.current.loading).toBe(false);
  });
});

describe('FolderContext — reload', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('re-fetches with the current dir', async () => {
    const response = makeFolderResponse();
    const manifestResponse = { excluded: [], lastViewed: null, groupBoundaries: [] };
    // Each loadFolder call makes 2 fetches: folder + manifest.
    // first load (folder + manifest) + reload (folder + manifest) = 4 responses
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope(response)), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(envelope(manifestResponse)), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope(response)), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(envelope(manifestResponse)), { status: 200 })
      );

    const { result } = renderHook(() => useFolderContext(), { wrapper });

    await act(async () => {
      await result.current.loadFolder('/some/folder');
    });

    // folder fetch + manifest fetch
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.reload();
    });

    // 2 more fetches on reload
    expect(fetch).toHaveBeenCalledTimes(4);
    // Both folder calls should reference the same folder path
    const [firstUrl] = vi.mocked(fetch).mock.calls[0] as [string];
    const [thirdUrl] = vi.mocked(fetch).mock.calls[2] as [string];
    expect(firstUrl).toContain(encodeURIComponent('/some/folder'));
    expect(thirdUrl).toContain(encodeURIComponent('/some/folder'));
  });

  it('does nothing when dir is null', async () => {
    const { result } = renderHook(() => useFolderContext(), { wrapper });

    await act(async () => {
      await result.current.reload();
    });

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('FolderContext — select', () => {
  it('sets the selected image', async () => {
    const response = makeFolderResponse();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(envelope(response)), { status: 200 })
    );

    const { result } = renderHook(() => useFolderContext(), { wrapper });

    await act(async () => {
      await result.current.loadFolder('/some/folder');
    });

    const image = result.current.sorted[0];

    act(() => {
      result.current.select(image);
    });

    expect(result.current.selected).toEqual(image);
  });

  it('clears the selected image when null is passed', async () => {
    const response = makeFolderResponse();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(envelope(response)), { status: 200 })
    );

    const { result } = renderHook(() => useFolderContext(), { wrapper });

    await act(async () => {
      await result.current.loadFolder('/some/folder');
    });

    act(() => {
      result.current.select(result.current.sorted[0]);
    });

    act(() => {
      result.current.select(null);
    });

    expect(result.current.selected).toBeNull();
  });
});

describe('useFolderContext — error boundary', () => {
  it('throws when used outside a FolderProvider', () => {
    const consoleError = console.error;
    console.error = () => {};

    expect(() => {
      renderHook(() => useFolderContext());
    }).toThrow('useFolderContext must be used within a FolderProvider');

    console.error = consoleError;
  });
});
