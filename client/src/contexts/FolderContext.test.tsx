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
    // first load + reload = 2 successful responses
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope(response)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope(response)), { status: 200 }));

    const { result } = renderHook(() => useFolderContext(), { wrapper });

    await act(async () => {
      await result.current.loadFolder('/some/folder');
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.reload();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    // Both calls should reference the same folder path
    const [firstUrl] = vi.mocked(fetch).mock.calls[0] as [string];
    const [secondUrl] = vi.mocked(fetch).mock.calls[1] as [string];
    expect(firstUrl).toContain(encodeURIComponent('/some/folder'));
    expect(secondUrl).toContain(encodeURIComponent('/some/folder'));
  });

  it('does nothing when dir is null', async () => {
    const { result } = renderHook(() => useFolderContext(), { wrapper });

    await act(async () => {
      await result.current.reload();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves the selected image after reload', async () => {
    const response = makeFolderResponse();
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope(response)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope(response)), { status: 200 }));

    const { result } = renderHook(() => useFolderContext(), { wrapper });

    // Load the folder and select an image
    await act(async () => {
      await result.current.loadFolder('/some/folder');
    });

    act(() => {
      result.current.select(result.current.sorted[0]);
    });

    expect(result.current.selected?.filename).toBe('01-hero.png');

    // Simulate what happens after drag-and-drop reorder
    await act(async () => {
      await result.current.reload();
    });

    // Selection should be restored from the refreshed list
    expect(result.current.selected).not.toBeNull();
    expect(result.current.selected?.filename).toBe('01-hero.png');
  });

  it('clears selected to null after reload when the file no longer exists', async () => {
    const initialResponse = makeFolderResponse();
    // After reload, the previously selected file is gone
    const reloadedResponse = makeFolderResponse({
      sorted: [
        {
          filename: '02-new.png',
          path: '/some/folder/02-new.png',
          number: 2,
          label: 'new.png',
          encodedPath: 'L3NvbWUvZm9sZGVyLzAyLW5ldy5wbmc=',
        },
      ],
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(envelope(initialResponse)), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(envelope(reloadedResponse)), { status: 200 })
      );

    const { result } = renderHook(() => useFolderContext(), { wrapper });

    await act(async () => {
      await result.current.loadFolder('/some/folder');
    });

    act(() => {
      result.current.select(result.current.sorted[0]);
    });

    expect(result.current.selected?.filename).toBe('01-hero.png');

    // Reload returns a list that no longer contains '01-hero.png'
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.selected).toBeNull();
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
