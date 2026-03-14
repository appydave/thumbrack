import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FolderImage } from '@appystack/shared';
import { SortedPane } from './SortedPane.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
let mockSorted: FolderImage[] = [];
let mockSelected: FolderImage | null = null;
let mockGroupBoundaries: string[] = [];

vi.mock('../contexts/FolderContext.js', () => ({
  useFolderContext: () => ({
    sorted: mockSorted,
    unsorted: [],
    excluded: [],
    groupBoundaries: mockGroupBoundaries,
    selected: mockSelected,
    loading: false,
    error: null,
    dir: null,
    select: mockSelect,
    loadFolder: vi.fn(),
    reload: vi.fn(),
  }),
}));

vi.mock('../hooks/useDividers.js', () => ({
  useDividers: () => ({
    addDivider: vi.fn(),
    removeDivider: vi.fn(),
  }),
}));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    toasts: [],
    removeToast: vi.fn(),
  }),
}));

// Avoid real network requests for image URLs in tests
vi.mock('../utils/api.js', () => ({
  imageUrl: (encodedPath: string) => `http://localhost:5021/api/images/${encodedPath}`,
  fetchFolder: vi.fn(),
  renameImage: vi.fn(),
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
// Fixtures
// ---------------------------------------------------------------------------

function makeImage(overrides: Partial<FolderImage> = {}): FolderImage {
  return {
    filename: '01-hero-shot.png',
    path: '/tmp/01-hero-shot.png',
    number: 1,
    label: 'hero-shot.png',
    encodedPath: 'L3RtcC8wMS1oZXJvLXNob3QucG5n',
    ...overrides,
  };
}

const IMAGE_A = makeImage({
  filename: '01-hero-shot.png',
  path: '/tmp/01-hero-shot.png',
  number: 1,
  label: 'hero-shot.png',
  encodedPath: 'L3RtcC8wMS1oZXJvLXNob3QucG5n',
});

const IMAGE_B = makeImage({
  filename: '07-closing-slide.png',
  path: '/tmp/07-closing-slide.png',
  number: 7,
  label: 'closing-slide.png',
  encodedPath: 'L3RtcC8wNy1jbG9zaW5nLXNsaWRlLnBuZw',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockSelect.mockReset();
  mockSorted = [];
  mockSelected = null;
  mockGroupBoundaries = [];
});

describe('SortedPane — empty state', () => {
  it('renders "No numbered images" when sorted list is empty', () => {
    mockSorted = [];
    render(<SortedPane />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No numbered images')).toBeInTheDocument();
  });

  it('does not render a list when sorted list is empty', () => {
    mockSorted = [];
    render(<SortedPane />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('SortedPane — header', () => {
  it('shows count of 0 in header when empty', () => {
    mockSorted = [];
    render(<SortedPane />);
    expect(screen.getByTestId('sorted-header')).toHaveTextContent('Sorted (0)');
  });

  it('shows correct count in header with images', () => {
    mockSorted = [IMAGE_A, IMAGE_B];
    render(<SortedPane />);
    expect(screen.getByTestId('sorted-header')).toHaveTextContent('Sorted (2)');
  });
});

describe('SortedPane — item rendering', () => {
  beforeEach(() => {
    mockSorted = [IMAGE_A, IMAGE_B];
  });

  it('renders one item per image in sorted list', () => {
    render(<SortedPane />);
    const items = screen.getAllByRole('option');
    expect(items).toHaveLength(2);
  });

  it('shows number badge padded to 2 digits for single-digit number', () => {
    render(<SortedPane />);
    const badges = screen.getAllByTestId('number-badge');
    expect(badges[0]).toHaveTextContent('01');
  });

  it('shows number badge padded to 2 digits for multi-digit number', () => {
    render(<SortedPane />);
    const badges = screen.getAllByTestId('number-badge');
    expect(badges[1]).toHaveTextContent('07');
  });

  it('shows label text for each image', () => {
    render(<SortedPane />);
    expect(screen.getByText('hero-shot.png')).toBeInTheDocument();
    expect(screen.getByText('closing-slide.png')).toBeInTheDocument();
  });

  it('renders a thumbnail img for each item', () => {
    render(<SortedPane />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute(
      'src',
      `http://localhost:5021/api/images/${IMAGE_A.encodedPath}`
    );
  });
});

describe('SortedPane — selection', () => {
  beforeEach(() => {
    mockSorted = [IMAGE_A, IMAGE_B];
  });

  it('calls select with the correct image when an item is clicked', () => {
    render(<SortedPane />);
    const items = screen.getAllByRole('option');
    fireEvent.click(items[0]);
    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockSelect).toHaveBeenCalledWith(IMAGE_A);
  });

  it('calls select with second image when second item is clicked', () => {
    render(<SortedPane />);
    const items = screen.getAllByRole('option');
    fireEvent.click(items[1]);
    expect(mockSelect).toHaveBeenCalledWith(IMAGE_B);
  });

  it('selected item has highlighted styling (bg-blue-100 class)', () => {
    mockSelected = IMAGE_A;
    render(<SortedPane />);
    const items = screen.getAllByRole('option');
    expect(items[0].className).toContain('bg-blue-100');
  });

  it('selected item has left border accent (border-blue-500 class)', () => {
    mockSelected = IMAGE_A;
    render(<SortedPane />);
    const items = screen.getAllByRole('option');
    expect(items[0].className).toContain('border-blue-500');
  });

  it('unselected item does not have highlighted styling', () => {
    mockSelected = IMAGE_A;
    render(<SortedPane />);
    const items = screen.getAllByRole('option');
    expect(items[1].className).not.toContain('bg-blue-100');
  });

  it('marks selected item with aria-selected=true', () => {
    mockSelected = IMAGE_A;
    render(<SortedPane />);
    const items = screen.getAllByRole('option');
    expect(items[0]).toHaveAttribute('aria-selected', 'true');
    expect(items[1]).toHaveAttribute('aria-selected', 'false');
  });
});

describe('SortedPane — thumbnail error handling', () => {
  it('shows grey placeholder when image fails to load', () => {
    mockSorted = [IMAGE_A];
    render(<SortedPane />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByTestId('thumb-error')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('SortedPane — group dividers', () => {
  it('renders a GroupDivider before an item whose filename is in groupBoundaries', () => {
    mockSorted = [IMAGE_A, IMAGE_B];
    mockGroupBoundaries = [IMAGE_B.filename];
    render(<SortedPane />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('does not render any GroupDivider when groupBoundaries is empty', () => {
    mockSorted = [IMAGE_A, IMAGE_B];
    mockGroupBoundaries = [];
    render(<SortedPane />);
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});
