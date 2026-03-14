import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FolderImage } from '@appystack/shared';
import { UnsortedPane } from './UnsortedPane.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
let mockUnsorted: FolderImage[] = [];
let mockSelected: FolderImage | null = null;

vi.mock('../contexts/FolderContext.js', () => ({
  useFolderContext: () => ({
    unsorted: mockUnsorted,
    sorted: [],
    excluded: [],
    selected: mockSelected,
    loading: false,
    error: null,
    dir: null,
    select: mockSelect,
    loadFolder: vi.fn(),
    reload: vi.fn(),
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
    filename: 'sunset-photo.png',
    path: '/tmp/sunset-photo.png',
    number: null,
    label: 'sunset-photo.png',
    encodedPath: 'L3RtcC9zdW5zZXQtcGhvdG8ucG5n',
    ...overrides,
  };
}

const IMAGE_A = makeImage({
  filename: 'sunset-photo.png',
  path: '/tmp/sunset-photo.png',
  number: null,
  label: 'sunset-photo.png',
  encodedPath: 'L3RtcC9zdW5zZXQtcGhvdG8ucG5n',
});

const IMAGE_B = makeImage({
  filename: 'mountain-view.jpg',
  path: '/tmp/mountain-view.jpg',
  number: null,
  label: 'mountain-view.jpg',
  encodedPath: 'L3RtcC9tb3VudGFpbi12aWV3LmpwZw',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockSelect.mockReset();
  mockUnsorted = [];
  mockSelected = null;
});

describe('UnsortedPane — empty state', () => {
  it('renders "No unsorted images" when list is empty', () => {
    mockUnsorted = [];
    render(<UnsortedPane />);
    expect(screen.getByTestId('unsorted-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No unsorted images')).toBeInTheDocument();
  });

  it('does not render a list when unsorted list is empty', () => {
    mockUnsorted = [];
    render(<UnsortedPane />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('UnsortedPane — header', () => {
  it('shows count of 0 in header when empty', () => {
    mockUnsorted = [];
    render(<UnsortedPane />);
    expect(screen.getByTestId('unsorted-header')).toHaveTextContent('0');
  });

  it('shows correct count in header with images', () => {
    mockUnsorted = [IMAGE_A, IMAGE_B];
    render(<UnsortedPane />);
    expect(screen.getByTestId('unsorted-header')).toHaveTextContent('2');
  });
});

describe('UnsortedPane — item rendering', () => {
  beforeEach(() => {
    mockUnsorted = [IMAGE_A, IMAGE_B];
  });

  it('renders one item per unsorted image', () => {
    render(<UnsortedPane />);
    const items = screen.getAllByRole('option');
    expect(items).toHaveLength(2);
  });

  it('shows label text for each image', () => {
    render(<UnsortedPane />);
    expect(screen.getByText('sunset-photo.png')).toBeInTheDocument();
    expect(screen.getByText('mountain-view.jpg')).toBeInTheDocument();
  });

  it('does not show a number badge', () => {
    render(<UnsortedPane />);
    expect(screen.queryByTestId('number-badge')).not.toBeInTheDocument();
  });

  it('renders a thumbnail img for each item', () => {
    render(<UnsortedPane />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute(
      'src',
      `http://localhost:5021/api/images/${IMAGE_A.encodedPath}`
    );
  });

  it('sets data-id attribute on each item to the filename', () => {
    render(<UnsortedPane />);
    const items = screen.getAllByRole('option');
    expect(items[0]).toHaveAttribute('data-id', IMAGE_A.filename);
    expect(items[1]).toHaveAttribute('data-id', IMAGE_B.filename);
  });
});

describe('UnsortedPane — selection', () => {
  beforeEach(() => {
    mockUnsorted = [IMAGE_A, IMAGE_B];
  });

  it('calls select with the correct image when an item is clicked', () => {
    render(<UnsortedPane />);
    const items = screen.getAllByRole('option');
    fireEvent.click(items[0]);
    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockSelect).toHaveBeenCalledWith(IMAGE_A);
  });

  it('calls select with second image when second item is clicked', () => {
    render(<UnsortedPane />);
    const items = screen.getAllByRole('option');
    fireEvent.click(items[1]);
    expect(mockSelect).toHaveBeenCalledWith(IMAGE_B);
  });

  it('selected item has highlighted styling (selected class)', () => {
    mockSelected = IMAGE_A;
    render(<UnsortedPane />);
    const items = screen.getAllByRole('option');
    expect(items[0].className).toContain('selected');
  });

  it('selected item has left border accent (selected class)', () => {
    mockSelected = IMAGE_A;
    render(<UnsortedPane />);
    const items = screen.getAllByRole('option');
    expect(items[0].className).toContain('selected');
  });

  it('unselected item does not have highlighted styling', () => {
    mockSelected = IMAGE_A;
    render(<UnsortedPane />);
    const items = screen.getAllByRole('option');
    expect(items[1].className).not.toContain('selected');
  });

  it('marks selected item with aria-selected=true', () => {
    mockSelected = IMAGE_A;
    render(<UnsortedPane />);
    const items = screen.getAllByRole('option');
    expect(items[0]).toHaveAttribute('aria-selected', 'true');
    expect(items[1]).toHaveAttribute('aria-selected', 'false');
  });
});

describe('UnsortedPane — thumbnail error handling', () => {
  it('shows grey placeholder when image fails to load', () => {
    mockUnsorted = [IMAGE_A];
    render(<UnsortedPane />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByTestId('thumb-error')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
