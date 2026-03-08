import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { FolderImage } from '@appystack/shared';
import { useKeyboardNav } from './useKeyboardNav.js';

// ---------------------------------------------------------------------------
// Mock FolderContext
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();

const mockContextValue = {
  sorted: [] as FolderImage[],
  unsorted: [] as FolderImage[],
  selected: null as FolderImage | null,
  select: mockSelect,
};

vi.mock('../contexts/FolderContext.js', () => ({
  useFolderContext: () => mockContextValue,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeImage(overrides: Partial<FolderImage> = {}): FolderImage {
  return {
    filename: 'test-image.png',
    path: '/tmp/test-image.png',
    number: null,
    label: 'test-image',
    encodedPath: 'L3RtcC90ZXN0LWltYWdlLnBuZw',
    ...overrides,
  };
}

const SORTED_A = makeImage({
  filename: '01-alpha.png',
  encodedPath: 'enc-sorted-a',
  number: 1,
  label: 'alpha',
});
const SORTED_B = makeImage({
  filename: '02-bravo.png',
  encodedPath: 'enc-sorted-b',
  number: 2,
  label: 'bravo',
});
const SORTED_C = makeImage({
  filename: '03-charlie.png',
  encodedPath: 'enc-sorted-c',
  number: 3,
  label: 'charlie',
});

const UNSORTED_X = makeImage({
  filename: 'xray.png',
  encodedPath: 'enc-unsorted-x',
  number: null,
  label: 'xray',
});
const UNSORTED_Y = makeImage({
  filename: 'yankee.png',
  encodedPath: 'enc-unsorted-y',
  number: null,
  label: 'yankee',
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockStartEdit = vi.fn();

function fireKey(key: string, tagName = 'BODY') {
  // Temporarily override activeElement
  Object.defineProperty(document, 'activeElement', {
    value: { tagName },
    configurable: true,
  });

  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
}

function renderNav() {
  return renderHook(() => useKeyboardNav(mockStartEdit));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockSelect.mockReset();
  mockStartEdit.mockReset();
  mockContextValue.sorted = [];
  mockContextValue.unsorted = [];
  mockContextValue.selected = null;
});

// ---------------------------------------------------------------------------
// ArrowDown tests
// ---------------------------------------------------------------------------

describe('useKeyboardNav — ArrowDown', () => {
  it('selects first sorted item when nothing is selected', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [];
    mockContextValue.selected = null;

    renderNav();
    fireKey('ArrowDown');

    expect(mockSelect).toHaveBeenCalledWith(SORTED_A);
  });

  it('selects first unsorted item when nothing selected and sorted is empty', () => {
    mockContextValue.sorted = [];
    mockContextValue.unsorted = [UNSORTED_X];
    mockContextValue.selected = null;

    renderNav();
    fireKey('ArrowDown');

    expect(mockSelect).toHaveBeenCalledWith(UNSORTED_X);
  });

  it('moves to next sorted item', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B, SORTED_C];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_A;

    renderNav();
    fireKey('ArrowDown');

    expect(mockSelect).toHaveBeenCalledWith(SORTED_B);
  });

  it('wraps from last sorted to first unsorted', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [UNSORTED_X, UNSORTED_Y];
    mockContextValue.selected = SORTED_B;

    renderNav();
    fireKey('ArrowDown');

    expect(mockSelect).toHaveBeenCalledWith(UNSORTED_X);
  });

  it('stays at last sorted when no unsorted items exist', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_B;

    renderNav();
    fireKey('ArrowDown');

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('moves to next unsorted item', () => {
    mockContextValue.sorted = [SORTED_A];
    mockContextValue.unsorted = [UNSORTED_X, UNSORTED_Y];
    mockContextValue.selected = UNSORTED_X;

    renderNav();
    fireKey('ArrowDown');

    expect(mockSelect).toHaveBeenCalledWith(UNSORTED_Y);
  });

  it('stays at last unsorted item when at the end', () => {
    mockContextValue.sorted = [SORTED_A];
    mockContextValue.unsorted = [UNSORTED_X, UNSORTED_Y];
    mockContextValue.selected = UNSORTED_Y;

    renderNav();
    fireKey('ArrowDown');

    expect(mockSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ArrowUp tests
// ---------------------------------------------------------------------------

describe('useKeyboardNav — ArrowUp', () => {
  it('moves to previous sorted item', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B, SORTED_C];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_C;

    renderNav();
    fireKey('ArrowUp');

    expect(mockSelect).toHaveBeenCalledWith(SORTED_B);
  });

  it('stays at first sorted item when at the top', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_A;

    renderNav();
    fireKey('ArrowUp');

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('wraps from first unsorted to last sorted', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [UNSORTED_X, UNSORTED_Y];
    mockContextValue.selected = UNSORTED_X;

    renderNav();
    fireKey('ArrowUp');

    expect(mockSelect).toHaveBeenCalledWith(SORTED_B);
  });

  it('moves to previous unsorted item', () => {
    mockContextValue.sorted = [];
    mockContextValue.unsorted = [UNSORTED_X, UNSORTED_Y];
    mockContextValue.selected = UNSORTED_Y;

    renderNav();
    fireKey('ArrowUp');

    expect(mockSelect).toHaveBeenCalledWith(UNSORTED_X);
  });

  it('selects first sorted when nothing is selected', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [];
    mockContextValue.selected = null;

    renderNav();
    fireKey('ArrowUp');

    expect(mockSelect).toHaveBeenCalledWith(SORTED_A);
  });
});

// ---------------------------------------------------------------------------
// Edit mode shortcut tests
// ---------------------------------------------------------------------------

describe('useKeyboardNav — F2 / e key', () => {
  it('calls startEdit with filename and number when F2 pressed on a sorted image', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_A;

    renderNav();
    fireKey('F2');

    expect(mockStartEdit).toHaveBeenCalledWith(SORTED_A.filename, SORTED_A.number);
  });

  it('calls startEdit with filename and number when e pressed on a sorted image', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_B;

    renderNav();
    fireKey('e');

    expect(mockStartEdit).toHaveBeenCalledWith(SORTED_B.filename, SORTED_B.number);
  });

  it('does not call startEdit when selected image is in unsorted', () => {
    mockContextValue.sorted = [SORTED_A];
    mockContextValue.unsorted = [UNSORTED_X];
    mockContextValue.selected = UNSORTED_X;

    renderNav();
    fireKey('F2');

    expect(mockStartEdit).not.toHaveBeenCalled();
  });

  it('does not call startEdit when nothing is selected', () => {
    mockContextValue.sorted = [SORTED_A];
    mockContextValue.unsorted = [];
    mockContextValue.selected = null;

    renderNav();
    fireKey('F2');

    expect(mockStartEdit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Input-field guard tests
// ---------------------------------------------------------------------------

describe('useKeyboardNav — INPUT guard', () => {
  it('does not navigate with ArrowDown when active element is INPUT', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_A;

    renderNav();
    fireKey('ArrowDown', 'INPUT');

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('does not navigate with ArrowUp when active element is INPUT', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_B;

    renderNav();
    fireKey('ArrowUp', 'INPUT');

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('does not call startEdit for F2 when active element is INPUT', () => {
    mockContextValue.sorted = [SORTED_A];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_A;

    renderNav();
    fireKey('F2', 'INPUT');

    expect(mockStartEdit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cleanup test
// ---------------------------------------------------------------------------

describe('useKeyboardNav — cleanup', () => {
  it('removes the keydown listener on unmount', () => {
    mockContextValue.sorted = [SORTED_A, SORTED_B];
    mockContextValue.unsorted = [];
    mockContextValue.selected = SORTED_A;

    const { unmount } = renderNav();
    unmount();

    // Fire ArrowDown after unmount — select should not be called
    fireKey('ArrowDown');

    expect(mockSelect).not.toHaveBeenCalled();
  });
});
