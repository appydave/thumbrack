import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FolderImage } from '@appystack/shared';
import { ExcludedPane } from './ExcludedPane.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockExcluded: FolderImage[] = [];
let mockDir: string | null = '/test/dir';
const mockReload = vi.fn();

const mockFetchManifest = vi.fn();
const mockSaveManifest = vi.fn();

vi.mock('../contexts/FolderContext.js', () => ({
  useFolderContext: () => ({
    excluded: mockExcluded,
    sorted: [],
    unsorted: [],
    selected: null,
    loading: false,
    error: null,
    dir: mockDir,
    select: vi.fn(),
    loadFolder: vi.fn(),
    reload: mockReload,
  }),
}));

vi.mock('../utils/api.js', () => ({
  imageUrl: (encodedPath: string) => `http://localhost:5021/api/images/${encodedPath}`,
  fetchManifest: (...args: unknown[]) => mockFetchManifest(...args),
  saveManifest: (...args: unknown[]) => mockSaveManifest(...args),
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeImage(overrides: Partial<FolderImage> = {}): FolderImage {
  return {
    filename: 'excluded-image.png',
    path: '/tmp/excluded-image.png',
    number: null,
    label: 'excluded-image.png',
    encodedPath: 'L3RtcC9leGNsdWRlZC1pbWFnZS5wbmc',
    ...overrides,
  };
}

const IMAGE_A = makeImage({
  filename: 'excluded-a.png',
  path: '/tmp/excluded-a.png',
  label: 'excluded-a.png',
  encodedPath: 'L3RtcC9leGNsdWRlZC1hLnBuZw',
});

const IMAGE_B = makeImage({
  filename: 'excluded-b.png',
  path: '/tmp/excluded-b.png',
  label: 'excluded-b.png',
  encodedPath: 'L3RtcC9leGNsdWRlZC1iLnBuZw',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockExcluded = [];
  mockDir = '/test/dir';
  mockReload.mockResolvedValue(undefined);
  mockFetchManifest.mockResolvedValue({ excluded: [], lastViewed: null });
  mockSaveManifest.mockResolvedValue(undefined);
});

describe('ExcludedPane — empty state', () => {
  it('renders nothing when excluded list is empty', () => {
    mockExcluded = [];
    render(<ExcludedPane />);
    expect(screen.queryByTestId('excluded-pane')).not.toBeInTheDocument();
  });
});

describe('ExcludedPane — header', () => {
  it('shows correct count in header', () => {
    mockExcluded = [IMAGE_A, IMAGE_B];
    render(<ExcludedPane />);
    expect(screen.getByTestId('excluded-header')).toHaveTextContent('2');
  });

  it('shows count of 1 with single image', () => {
    mockExcluded = [IMAGE_A];
    render(<ExcludedPane />);
    expect(screen.getByTestId('excluded-header')).toHaveTextContent('1');
  });
});

describe('ExcludedPane — item rendering', () => {
  beforeEach(() => {
    mockExcluded = [IMAGE_A, IMAGE_B];
  });

  it('renders the excluded pane when there are excluded images', () => {
    render(<ExcludedPane />);
    expect(screen.getByTestId('excluded-pane')).toBeInTheDocument();
  });

  it('renders one item per excluded image', () => {
    render(<ExcludedPane />);
    const items = screen.getAllByTestId('excluded-item');
    expect(items).toHaveLength(2);
  });

  it('shows label text for each image', () => {
    render(<ExcludedPane />);
    expect(screen.getByText('excluded-a.png')).toBeInTheDocument();
    expect(screen.getByText('excluded-b.png')).toBeInTheDocument();
  });

  it('renders items with excluded-item styling', () => {
    render(<ExcludedPane />);
    const items = screen.getAllByTestId('excluded-item');
    items.forEach((item) => {
      expect(item.className).toContain('excluded-item');
    });
  });

  it('renders a thumbnail img for each item', () => {
    render(<ExcludedPane />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute(
      'src',
      `http://localhost:5021/api/images/${IMAGE_A.encodedPath}`
    );
  });
});

describe('ExcludedPane — context menu', () => {
  it('does not show context menu initially', () => {
    mockExcluded = [IMAGE_A];
    render(<ExcludedPane />);
    expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();
  });

  it('shows context menu with "Un-exclude" option on right-click', () => {
    mockExcluded = [IMAGE_A];
    render(<ExcludedPane />);
    const item = screen.getByTestId('excluded-item');
    fireEvent.contextMenu(item);
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
    expect(screen.getByText('Un-exclude')).toBeInTheDocument();
  });

  it('closes context menu after clicking a menu item', () => {
    mockExcluded = [IMAGE_A];
    render(<ExcludedPane />);
    const item = screen.getByTestId('excluded-item');
    fireEvent.contextMenu(item);
    fireEvent.click(screen.getByText('Un-exclude'));
    expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();
  });
});
