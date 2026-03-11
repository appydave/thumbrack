import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useClickOutside } from './useClickOutside.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useClickOutside', () => {
  it('calls onOutside when mousedown fires outside the ref element', () => {
    const onOutside = vi.fn();
    const div = document.createElement('div');
    document.body.appendChild(div);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(div);
      useClickOutside(ref, onOutside);
    });

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onOutside).toHaveBeenCalledTimes(1);

    unmount();
    document.body.removeChild(div);
    document.body.removeChild(outside);
  });

  it('does not call onOutside when mousedown fires inside the ref element', () => {
    const onOutside = vi.fn();
    const div = document.createElement('div');
    document.body.appendChild(div);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(div);
      useClickOutside(ref, onOutside);
    });

    div.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onOutside).not.toHaveBeenCalled();

    unmount();
    document.body.removeChild(div);
  });

  it('removes the event listener on unmount', () => {
    const onOutside = vi.fn();
    const div = document.createElement('div');
    document.body.appendChild(div);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement | null>(div);
      useClickOutside(ref, onOutside);
    });

    unmount();

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onOutside).not.toHaveBeenCalled();

    document.body.removeChild(div);
    document.body.removeChild(outside);
  });
});
