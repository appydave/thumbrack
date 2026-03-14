import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ManifestData } from '@appystack/shared';
import { useDividers } from './useDividers.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchManifest = vi.fn();
const mockSaveManifest = vi.fn();

vi.mock('../utils/api.js', () => ({
  fetchManifest: (...args: unknown[]) => mockFetchManifest(...args),
  saveManifest: (...args: unknown[]) => mockSaveManifest(...args),
  imageUrl: vi.fn(),
  fetchFolder: vi.fn(),
  renameImage: vi.fn(),
  reorderImages: vi.fn(),
  regenerateManifest: vi.fn(),
  api: { get: vi.fn(), post: vi.fn() },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));

const mockReload = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../contexts/FolderContext.js', () => ({
  useFolderContext: () => ({
    dir: '/test/dir',
    reload: mockReload,
    sorted: [],
    unsorted: [],
    excluded: [],
    groupBoundaries: [],
    selected: null,
    loading: false,
    error: null,
    loadFolder: vi.fn(),
    select: vi.fn(),
  }),
}));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<ManifestData> = {}): ManifestData {
  return {
    excluded: [],
    lastViewed: null,
    groupBoundaries: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveManifest.mockResolvedValue(undefined);
  mockReload.mockResolvedValue(undefined);
});

describe('useDividers — addDivider', () => {
  it('adds filename to manifest groupBoundaries and calls reload', async () => {
    const manifest = makeManifest({ groupBoundaries: [] });
    mockFetchManifest.mockResolvedValue(manifest);

    const { result } = renderHook(() => useDividers());
    await result.current.addDivider('image.png');

    expect(mockSaveManifest).toHaveBeenCalledWith('/test/dir', {
      ...manifest,
      groupBoundaries: ['image.png'],
    });
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('appends filename to existing groupBoundaries', async () => {
    const manifest = makeManifest({ groupBoundaries: ['existing.png'] });
    mockFetchManifest.mockResolvedValue(manifest);

    const { result } = renderHook(() => useDividers());
    await result.current.addDivider('new.png');

    const saved = mockSaveManifest.mock.calls[0][1] as ManifestData;
    expect(saved.groupBoundaries).toEqual(['existing.png', 'new.png']);
  });

  it('handles manifest without groupBoundaries field gracefully', async () => {
    const manifest = makeManifest();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { groupBoundaries: _gb, ...manifestWithoutBoundaries } = manifest;
    mockFetchManifest.mockResolvedValue(manifestWithoutBoundaries);

    const { result } = renderHook(() => useDividers());
    await result.current.addDivider('image.png');

    const saved = mockSaveManifest.mock.calls[0][1] as ManifestData;
    expect(saved.groupBoundaries).toEqual(['image.png']);
  });

  it('calls addToast with error when fetchManifest throws', async () => {
    mockFetchManifest.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDividers());
    await result.current.addDivider('image.png');

    expect(mockAddToast).toHaveBeenCalledWith('Failed to add divider', 'error');
    expect(mockReload).not.toHaveBeenCalled();
  });
});

describe('useDividers — removeDivider', () => {
  it('removes filename from groupBoundaries and calls reload', async () => {
    const manifest = makeManifest({ groupBoundaries: ['keep.png', 'remove.png'] });
    mockFetchManifest.mockResolvedValue(manifest);

    const { result } = renderHook(() => useDividers());
    await result.current.removeDivider('remove.png');

    expect(mockSaveManifest).toHaveBeenCalledWith('/test/dir', {
      ...manifest,
      groupBoundaries: ['keep.png'],
    });
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('leaves list unchanged when filename is not present', async () => {
    const manifest = makeManifest({ groupBoundaries: ['other.png'] });
    mockFetchManifest.mockResolvedValue(manifest);

    const { result } = renderHook(() => useDividers());
    await result.current.removeDivider('nonexistent.png');

    const saved = mockSaveManifest.mock.calls[0][1] as ManifestData;
    expect(saved.groupBoundaries).toEqual(['other.png']);
  });

  it('calls addToast with error when fetchManifest throws', async () => {
    mockFetchManifest.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDividers());
    await result.current.removeDivider('image.png');

    expect(mockAddToast).toHaveBeenCalledWith('Failed to remove divider', 'error');
    expect(mockReload).not.toHaveBeenCalled();
  });
});
