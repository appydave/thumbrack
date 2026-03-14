import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ManifestData } from '@appystack/shared';
import { useExclusion } from './useExclusion.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchManifest = vi.fn();
const mockSaveManifest = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../utils/api.js', () => ({
  fetchManifest: (...args: unknown[]) => mockFetchManifest(...args),
  saveManifest: (...args: unknown[]) => mockSaveManifest(...args),
}));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<ManifestData> = {}): ManifestData {
  return {
    excluded: [],
    lastViewed: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveManifest.mockResolvedValue(undefined);
  mockAddToast.mockReturnValue(undefined);
});

describe('useExclusion — exclude', () => {
  it('calls fetchManifest with the dir', async () => {
    const manifest = makeManifest();
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.exclude('image.png');

    expect(mockFetchManifest).toHaveBeenCalledWith('/test/dir');
  });

  it('calls saveManifest with the filename added to excluded list', async () => {
    const manifest = makeManifest({ excluded: ['existing.png'] });
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.exclude('new-image.png');

    expect(mockSaveManifest).toHaveBeenCalledWith('/test/dir', {
      ...manifest,
      excluded: ['existing.png', 'new-image.png'],
    });
  });

  it('deduplicates filenames when excluding an already-excluded image', async () => {
    const manifest = makeManifest({ excluded: ['already.png'] });
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.exclude('already.png');

    const savedManifest = mockSaveManifest.mock.calls[0][1] as ManifestData;
    expect(savedManifest.excluded).toEqual(['already.png']);
    expect(savedManifest.excluded).toHaveLength(1);
  });

  it('calls reload after saving', async () => {
    const manifest = makeManifest();
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.exclude('image.png');

    expect(reload).toHaveBeenCalledOnce();
  });

  it('does nothing when dir is null', async () => {
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion(null, reload));
    await result.current.exclude('image.png');

    expect(mockFetchManifest).not.toHaveBeenCalled();
    expect(mockSaveManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('useExclusion — unexclude', () => {
  it('calls fetchManifest with the dir', async () => {
    const manifest = makeManifest({ excluded: ['image.png'] });
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.unexclude('image.png');

    expect(mockFetchManifest).toHaveBeenCalledWith('/test/dir');
  });

  it('calls saveManifest with the filename removed from excluded list', async () => {
    const manifest = makeManifest({ excluded: ['keep.png', 'remove.png'] });
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.unexclude('remove.png');

    expect(mockSaveManifest).toHaveBeenCalledWith('/test/dir', {
      ...manifest,
      excluded: ['keep.png'],
    });
  });

  it('calls reload after saving', async () => {
    const manifest = makeManifest({ excluded: ['image.png'] });
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.unexclude('image.png');

    expect(reload).toHaveBeenCalledOnce();
  });

  it('does nothing when dir is null', async () => {
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion(null, reload));
    await result.current.unexclude('image.png');

    expect(mockFetchManifest).not.toHaveBeenCalled();
    expect(mockSaveManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('handles unexclude of a filename not in the list gracefully', async () => {
    const manifest = makeManifest({ excluded: ['other.png'] });
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.unexclude('nonexistent.png');

    const savedManifest = mockSaveManifest.mock.calls[0][1] as ManifestData;
    expect(savedManifest.excluded).toEqual(['other.png']);
  });
});

// ---------------------------------------------------------------------------
// Error path tests
// ---------------------------------------------------------------------------

describe('useExclusion — exclude error handling', () => {
  it('calls addToast with error when fetchManifest throws during exclude', async () => {
    mockFetchManifest.mockRejectedValue(new Error('Network error'));
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.exclude('image.png');

    expect(mockAddToast).toHaveBeenCalledWith('Failed to exclude image', 'error');
  });

  it('calls addToast with error when saveManifest throws during exclude', async () => {
    const manifest = makeManifest();
    mockFetchManifest.mockResolvedValue(manifest);
    mockSaveManifest.mockRejectedValue(new Error('Save failed'));
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.exclude('image.png');

    expect(mockAddToast).toHaveBeenCalledWith('Failed to exclude image', 'error');
  });

  it('does not call reload when exclude throws', async () => {
    mockFetchManifest.mockRejectedValue(new Error('Network error'));
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.exclude('image.png');

    expect(reload).not.toHaveBeenCalled();
  });

  it('does not call addToast on successful exclude', async () => {
    const manifest = makeManifest();
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.exclude('image.png');

    expect(mockAddToast).not.toHaveBeenCalled();
  });
});

describe('useExclusion — unexclude error handling', () => {
  it('calls addToast with error when fetchManifest throws during unexclude', async () => {
    mockFetchManifest.mockRejectedValue(new Error('Network error'));
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.unexclude('image.png');

    expect(mockAddToast).toHaveBeenCalledWith('Failed to unexclude image', 'error');
  });

  it('calls addToast with error when saveManifest throws during unexclude', async () => {
    const manifest = makeManifest({ excluded: ['image.png'] });
    mockFetchManifest.mockResolvedValue(manifest);
    mockSaveManifest.mockRejectedValue(new Error('Save failed'));
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.unexclude('image.png');

    expect(mockAddToast).toHaveBeenCalledWith('Failed to unexclude image', 'error');
  });

  it('does not call reload when unexclude throws', async () => {
    mockFetchManifest.mockRejectedValue(new Error('Network error'));
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.unexclude('image.png');

    expect(reload).not.toHaveBeenCalled();
  });

  it('does not call addToast on successful unexclude', async () => {
    const manifest = makeManifest({ excluded: ['image.png'] });
    mockFetchManifest.mockResolvedValue(manifest);
    const reload = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useExclusion('/test/dir', reload));
    await result.current.unexclude('image.png');

    expect(mockAddToast).not.toHaveBeenCalled();
  });
});
