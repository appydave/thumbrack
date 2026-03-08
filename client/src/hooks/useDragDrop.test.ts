import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import type { FolderImage } from '@appystack/shared';
import { useDragDrop } from './useDragDrop.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReorderImages = vi.fn();
const mockRenameImage = vi.fn();

vi.mock('../utils/api.js', () => ({
  reorderImages: (...args: unknown[]) => mockReorderImages(...args),
  renameImage: (...args: unknown[]) => mockRenameImage(...args),
  imageUrl: (encodedPath: string) => `http://localhost:5021/api/images/${encodedPath}`,
  fetchFolder: vi.fn(),
  fetchManifest: vi.fn(),
  saveManifest: vi.fn(),
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeImage(overrides: Partial<FolderImage> = {}): FolderImage {
  return {
    filename: 'test.png',
    path: '/tmp/test.png',
    number: 1,
    label: 'test.png',
    encodedPath: 'L3RtcC90ZXN0LnBuZw',
    ...overrides,
  };
}

/** Build a minimal DragEndEvent as dnd-kit would produce */
function makeDragEndEvent(
  activeId: string,
  overId: string | null
): DragEndEvent {
  return {
    active: {
      id: activeId,
      data: { current: undefined },
      rect: { current: { initial: null, translated: null } },
    },
    over: overId
      ? {
          id: overId,
          data: { current: undefined },
          rect: { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 },
          disabled: false,
        }
      : null,
    delta: { x: 0, y: 0 },
    activatorEvent: new MouseEvent('mousedown'),
    collisions: null,
  } as unknown as DragEndEvent;
}

function makeDragOverEvent(
  activeId: string,
  overId: string | null
): DragOverEvent {
  return {
    active: {
      id: activeId,
      data: { current: undefined },
      rect: { current: { initial: null, translated: null } },
    },
    over: overId
      ? {
          id: overId,
          data: { current: undefined },
          rect: { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 },
          disabled: false,
        }
      : null,
    delta: { x: 0, y: 0 },
    activatorEvent: new MouseEvent('mousedown'),
    collisions: null,
  } as unknown as DragOverEvent;
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const IMAGE_A = makeImage({
  filename: '01-hero.png',
  number: 1,
  label: 'hero.png',
  encodedPath: 'aaa',
});

const IMAGE_B = makeImage({
  filename: '02-closing.png',
  number: 2,
  label: 'closing.png',
  encodedPath: 'bbb',
});

const IMAGE_C = makeImage({
  filename: '03-end.png',
  number: 3,
  label: 'end.png',
  encodedPath: 'ccc',
});

const UNSORTED_X = makeImage({
  filename: 'unsorted-x.png',
  number: null,
  label: 'unsorted-x.png',
  encodedPath: 'xxx',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockReorderImages.mockReset();
  mockRenameImage.mockReset();
});

describe('useDragDrop — handleDragEnd', () => {
  it('is a no-op when dir is null', async () => {
    const mockReload = vi.fn();
    const { result } = renderHook(() =>
      useDragDrop({
        dir: null,
        sorted: [IMAGE_A, IMAGE_B],
        unsorted: [],
        reload: mockReload,
      })
    );

    await act(async () => {
      result.current.handleDragEnd(makeDragEndEvent(IMAGE_A.filename, IMAGE_B.filename));
    });

    expect(mockReorderImages).not.toHaveBeenCalled();
    expect(mockRenameImage).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('is a no-op when active === over (dropped in same position)', async () => {
    const mockReload = vi.fn();
    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B],
        unsorted: [],
        reload: mockReload,
      })
    );

    await act(async () => {
      result.current.handleDragEnd(makeDragEndEvent(IMAGE_A.filename, IMAGE_A.filename));
    });

    expect(mockReorderImages).not.toHaveBeenCalled();
    expect(mockRenameImage).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('is a no-op when dropped with no over target', async () => {
    const mockReload = vi.fn();
    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B],
        unsorted: [],
        reload: mockReload,
      })
    );

    await act(async () => {
      result.current.handleDragEnd(makeDragEndEvent(IMAGE_A.filename, null));
    });

    expect(mockReorderImages).not.toHaveBeenCalled();
    expect(mockRenameImage).not.toHaveBeenCalled();
  });

  it('calls reorderImages with the correct new order when a sorted item is moved', async () => {
    const mockReload = vi.fn().mockResolvedValue(undefined);
    mockReorderImages.mockResolvedValue({ success: true, renamedFiles: [] });

    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B, IMAGE_C],
        unsorted: [],
        reload: mockReload,
      })
    );

    // Move IMAGE_A (index 0) to IMAGE_C's position (index 2)
    await act(async () => {
      result.current.handleDragEnd(makeDragEndEvent(IMAGE_A.filename, IMAGE_C.filename));
    });

    expect(mockReorderImages).toHaveBeenCalledOnce();
    expect(mockReorderImages).toHaveBeenCalledWith({
      dir: '/some/dir',
      order: [IMAGE_B.filename, IMAGE_C.filename, IMAGE_A.filename],
    });
  });

  it('calls reload after successful reorder', async () => {
    const mockReload = vi.fn().mockResolvedValue(undefined);
    mockReorderImages.mockResolvedValue({ success: true, renamedFiles: [] });

    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B],
        unsorted: [],
        reload: mockReload,
      })
    );

    await act(async () => {
      result.current.handleDragEnd(makeDragEndEvent(IMAGE_A.filename, IMAGE_B.filename));
    });

    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('calls reload even when reorderImages fails', async () => {
    const mockReload = vi.fn().mockResolvedValue(undefined);
    mockReorderImages.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B],
        unsorted: [],
        reload: mockReload,
      })
    );

    await act(async () => {
      result.current.handleDragEnd(makeDragEndEvent(IMAGE_A.filename, IMAGE_B.filename));
    });

    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('calls renameImage when an unsorted item is dropped into the sorted list', async () => {
    const mockReload = vi.fn().mockResolvedValue(undefined);
    mockRenameImage.mockResolvedValue({ success: true, renamedFiles: [] });

    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B, IMAGE_C],
        unsorted: [UNSORTED_X],
        reload: mockReload,
      })
    );

    // Drop UNSORTED_X onto IMAGE_B (index 1) — should get newNumber = 2
    await act(async () => {
      result.current.handleDragEnd(makeDragEndEvent(UNSORTED_X.filename, IMAGE_B.filename));
    });

    expect(mockRenameImage).toHaveBeenCalledOnce();
    expect(mockRenameImage).toHaveBeenCalledWith({
      dir: '/some/dir',
      filename: UNSORTED_X.filename,
      newNumber: 2,
    });
  });

  it('calls renameImage with newNumber=1 when dropped at first sorted position', async () => {
    const mockReload = vi.fn().mockResolvedValue(undefined);
    mockRenameImage.mockResolvedValue({ success: true, renamedFiles: [] });

    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B],
        unsorted: [UNSORTED_X],
        reload: mockReload,
      })
    );

    // Drop UNSORTED_X onto IMAGE_A (index 0) — should get newNumber = 1
    await act(async () => {
      result.current.handleDragEnd(makeDragEndEvent(UNSORTED_X.filename, IMAGE_A.filename));
    });

    expect(mockRenameImage).toHaveBeenCalledWith({
      dir: '/some/dir',
      filename: UNSORTED_X.filename,
      newNumber: 1,
    });
  });

  it('calls reload after successful rename from unsorted', async () => {
    const mockReload = vi.fn().mockResolvedValue(undefined);
    mockRenameImage.mockResolvedValue({ success: true, renamedFiles: [] });

    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B],
        unsorted: [UNSORTED_X],
        reload: mockReload,
      })
    );

    await act(async () => {
      result.current.handleDragEnd(makeDragEndEvent(UNSORTED_X.filename, IMAGE_A.filename));
    });

    expect(mockReload).toHaveBeenCalledOnce();
  });
});

describe('useDragDrop — handleDragOver', () => {
  it('updates overId when dragging over an item', () => {
    const mockReload = vi.fn();
    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B],
        unsorted: [],
        reload: mockReload,
      })
    );

    act(() => {
      result.current.handleDragOver(makeDragOverEvent(IMAGE_A.filename, IMAGE_B.filename));
    });

    expect(result.current.overId).toBe(IMAGE_B.filename);
  });

  it('sets overId to null when not over any item', () => {
    const mockReload = vi.fn();
    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A, IMAGE_B],
        unsorted: [],
        reload: mockReload,
      })
    );

    act(() => {
      result.current.handleDragOver(makeDragOverEvent(IMAGE_A.filename, null));
    });

    expect(result.current.overId).toBeNull();
  });
});

describe('useDragDrop — activeId', () => {
  it('returns null initially', () => {
    const { result } = renderHook(() =>
      useDragDrop({
        dir: '/some/dir',
        sorted: [IMAGE_A],
        unsorted: [],
        reload: vi.fn(),
      })
    );

    expect(result.current.activeId).toBeNull();
  });
});
