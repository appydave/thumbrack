import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useManualEntry } from './useManualEntry.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRenameImage = vi.fn();
const mockReload = vi.fn();

vi.mock('../utils/api.js', () => ({
  renameImage: (...args: unknown[]) => mockRenameImage(...args),
  imageUrl: vi.fn(),
  fetchFolder: vi.fn(),
  reorderImages: vi.fn(),
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

const DIR = '/tmp/photos';
const FILENAME = '05-some-image.png';
const CURRENT_NUMBER = 5;

function renderEntry() {
  return renderHook(() => useManualEntry(DIR, mockReload));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockRenameImage.mockReset();
  mockReload.mockReset();
  mockReload.mockResolvedValue(undefined);
});

describe('useManualEntry — startEdit', () => {
  it('sets editingFilename to the given filename', () => {
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });

    expect(result.current.editingFilename).toBe(FILENAME);
  });

  it('sets editValue to the string representation of currentNumber', () => {
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });

    expect(result.current.editValue).toBe('5');
  });

  it('initial state has editingFilename null and editValue empty', () => {
    const { result } = renderEntry();
    expect(result.current.editingFilename).toBeNull();
    expect(result.current.editValue).toBe('');
  });
});

describe('useManualEntry — cancelEdit', () => {
  it('clears editingFilename without calling renameImage', async () => {
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.cancelEdit();
    });

    expect(result.current.editingFilename).toBeNull();
    expect(mockRenameImage).not.toHaveBeenCalled();
  });

  it('clears editValue', () => {
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.cancelEdit();
    });

    expect(result.current.editValue).toBe('');
  });

  it('does not call reload', () => {
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.cancelEdit();
    });

    expect(mockReload).not.toHaveBeenCalled();
  });
});

describe('useManualEntry — confirmEdit (valid value)', () => {
  it('calls renameImage with correct dir, filename, and newNumber', async () => {
    mockRenameImage.mockResolvedValue({ success: true, renamedFiles: [] });
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.setEditValue('12');
    });

    await act(async () => {
      await result.current.confirmEdit();
    });

    expect(mockRenameImage).toHaveBeenCalledOnce();
    expect(mockRenameImage).toHaveBeenCalledWith({
      dir: DIR,
      filename: FILENAME,
      newNumber: 12,
    });
  });

  it('calls reload after a successful rename', async () => {
    mockRenameImage.mockResolvedValue({ success: true, renamedFiles: [] });
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.setEditValue('3');
    });

    await act(async () => {
      await result.current.confirmEdit();
    });

    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('clears editingFilename after completion', async () => {
    mockRenameImage.mockResolvedValue({ success: true, renamedFiles: [] });
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.setEditValue('7');
    });

    await act(async () => {
      await result.current.confirmEdit();
    });

    expect(result.current.editingFilename).toBeNull();
  });
});

describe('useManualEntry — confirmEdit (invalid values)', () => {
  it.each([
    ['0', 0],
    ['100', 100],
    ['abc', NaN],
    ['-1', -1],
    ['', NaN],
  ])('does not call renameImage when value is "%s"', async (inputValue) => {
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.setEditValue(inputValue);
    });

    await act(async () => {
      await result.current.confirmEdit();
    });

    expect(mockRenameImage).not.toHaveBeenCalled();
  });

  it('clears editingFilename even when value is invalid', async () => {
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.setEditValue('0');
    });

    await act(async () => {
      await result.current.confirmEdit();
    });

    expect(result.current.editingFilename).toBeNull();
  });

  it('does not call reload when value is invalid', async () => {
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.setEditValue('100');
    });

    await act(async () => {
      await result.current.confirmEdit();
    });

    expect(mockReload).not.toHaveBeenCalled();
  });
});

describe('useManualEntry — confirmEdit (API failure)', () => {
  it('clears editingFilename even when renameImage rejects', async () => {
    mockRenameImage.mockRejectedValue(new Error('Network error'));
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.setEditValue('9');
    });

    await act(async () => {
      await result.current.confirmEdit();
    });

    expect(result.current.editingFilename).toBeNull();
  });
});

describe('useManualEntry — boundary values', () => {
  it.each([
    ['1', 1],
    ['99', 99],
  ])('accepts boundary value "%s" and calls renameImage', async (inputValue, expectedNumber) => {
    mockRenameImage.mockResolvedValue({ success: true, renamedFiles: [] });
    const { result } = renderEntry();

    act(() => {
      result.current.startEdit(FILENAME, CURRENT_NUMBER);
    });
    act(() => {
      result.current.setEditValue(inputValue);
    });

    await act(async () => {
      await result.current.confirmEdit();
    });

    expect(mockRenameImage).toHaveBeenCalledWith(
      expect.objectContaining({ newNumber: expectedNumber })
    );
  });
});
