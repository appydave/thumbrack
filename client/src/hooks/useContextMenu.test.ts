import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FolderImage } from '@appystack/shared';
import { useContextMenu } from './useContextMenu.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeImage(overrides: Partial<FolderImage> = {}): FolderImage {
  return {
    filename: 'test-image.png',
    path: '/tmp/test-image.png',
    number: null,
    label: 'test-image.png',
    encodedPath: 'L3RtcC90ZXN0LWltYWdlLnBuZw',
    ...overrides,
  };
}

function makeMouseEvent(x: number, y: number): React.MouseEvent {
  return {
    preventDefault: () => {},
    clientX: x,
    clientY: y,
  } as React.MouseEvent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useContextMenu', () => {
  it('starts with menu null', () => {
    const { result } = renderHook(() => useContextMenu());
    expect(result.current.menu).toBeNull();
  });

  it('openMenu sets menu with correct x, y, and image', () => {
    const { result } = renderHook(() => useContextMenu());
    const image = makeImage();

    act(() => {
      result.current.openMenu(makeMouseEvent(150, 250), image);
    });

    expect(result.current.menu).not.toBeNull();
    expect(result.current.menu?.x).toBe(150);
    expect(result.current.menu?.y).toBe(250);
    expect(result.current.menu?.image).toBe(image);
  });

  it('openMenu calls preventDefault', () => {
    const { result } = renderHook(() => useContextMenu());
    const image = makeImage();
    let preventDefaultCalled = false;

    act(() => {
      result.current.openMenu(
        { preventDefault: () => { preventDefaultCalled = true; }, clientX: 0, clientY: 0 } as React.MouseEvent,
        image
      );
    });

    expect(preventDefaultCalled).toBe(true);
  });

  it('closeMenu sets menu to null', () => {
    const { result } = renderHook(() => useContextMenu());
    const image = makeImage();

    act(() => {
      result.current.openMenu(makeMouseEvent(100, 100), image);
    });

    expect(result.current.menu).not.toBeNull();

    act(() => {
      result.current.closeMenu();
    });

    expect(result.current.menu).toBeNull();
  });
});
