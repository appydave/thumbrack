import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentFolders, loadRecent, saveRecent, RECENT_KEY } from './useRecentFolders.js';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
beforeEach(() => localStorageMock.clear());

// ---------------------------------------------------------------------------
// loadRecent / saveRecent unit tests
// ---------------------------------------------------------------------------

describe('loadRecent', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(loadRecent()).toEqual([]);
  });

  it('returns parsed array from localStorage', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['/a', '/b']));
    expect(loadRecent()).toEqual(['/a', '/b']);
  });

  it('returns empty array when localStorage value is invalid JSON', () => {
    localStorage.setItem(RECENT_KEY, 'not-json');
    expect(loadRecent()).toEqual([]);
  });
});

describe('saveRecent', () => {
  it('saves a path and returns array with it first', () => {
    const result = saveRecent('/foo/bar');
    expect(result).toEqual(['/foo/bar']);
    expect(loadRecent()).toEqual(['/foo/bar']);
  });

  it('deduplication: loading same path twice results in one entry', () => {
    saveRecent('/folder/a');
    const result = saveRecent('/folder/a');
    expect(result).toEqual(['/folder/a']);
  });

  it('deduplication: existing entry is moved to front', () => {
    saveRecent('/folder/a');
    saveRecent('/folder/b');
    const result = saveRecent('/folder/a');
    expect(result).toEqual(['/folder/a', '/folder/b']);
  });

  it('max 5 entries: 6th load pushes out the oldest', () => {
    saveRecent('/1');
    saveRecent('/2');
    saveRecent('/3');
    saveRecent('/4');
    saveRecent('/5');
    const result = saveRecent('/6');
    expect(result).toHaveLength(5);
    expect(result[0]).toBe('/6');
    expect(result).not.toContain('/1');
  });

  it('stores most-recent path first', () => {
    saveRecent('/old');
    const result = saveRecent('/new');
    expect(result[0]).toBe('/new');
    expect(result[1]).toBe('/old');
  });
});

// ---------------------------------------------------------------------------
// useRecentFolders hook tests
// ---------------------------------------------------------------------------

describe('useRecentFolders', () => {
  it('initialises with empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useRecentFolders());
    expect(result.current.recentFolders).toEqual([]);
  });

  it('initialises with existing localStorage data', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['/existing/path']));
    const { result } = renderHook(() => useRecentFolders());
    expect(result.current.recentFolders).toEqual(['/existing/path']);
  });

  it('addRecentFolder adds a path to recentFolders', () => {
    const { result } = renderHook(() => useRecentFolders());
    act(() => {
      result.current.addRecentFolder('/some/path');
    });
    expect(result.current.recentFolders).toContain('/some/path');
  });

  it('addRecentFolder persists path to localStorage', () => {
    const { result } = renderHook(() => useRecentFolders());
    act(() => {
      result.current.addRecentFolder('/persisted/path');
    });
    expect(loadRecent()).toContain('/persisted/path');
  });

  it('addRecentFolder deduplicates: same path appears only once', () => {
    const { result } = renderHook(() => useRecentFolders());
    act(() => {
      result.current.addRecentFolder('/dup/path');
    });
    act(() => {
      result.current.addRecentFolder('/dup/path');
    });
    expect(result.current.recentFolders.filter((p) => p === '/dup/path')).toHaveLength(1);
  });

  it('addRecentFolder caps at 5 entries', () => {
    const { result } = renderHook(() => useRecentFolders());
    for (let i = 1; i <= 6; i++) {
      act(() => {
        result.current.addRecentFolder(`/path/${String(i)}`);
      });
    }
    expect(result.current.recentFolders).toHaveLength(5);
  });
});
