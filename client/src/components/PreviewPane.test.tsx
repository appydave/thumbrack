import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FolderImage } from '@appystack/shared';
import { PreviewPane } from './PreviewPane.js';

// ---------------------------------------------------------------------------
// Mock FolderContext
// ---------------------------------------------------------------------------

const mockImage: FolderImage = {
  filename: '01-ecamm-title.png',
  path: '/Users/david/images/01-ecamm-title.png',
  number: 1,
  label: 'ecamm-title.png',
  encodedPath: 'L1VzZXJzL2RhdmlkL2ltYWdlcy8wMS1lY2FtbS10aXRsZS5wbmc',
};

const mockContextValue = {
  dir: '/Users/david/images',
  sorted: [],
  unsorted: [],
  excluded: [],
  selected: null as FolderImage | null,
  loading: false,
  error: null,
  loadFolder: vi.fn(),
  reload: vi.fn(),
  select: vi.fn(),
};

vi.mock('../contexts/FolderContext.js', () => ({
  useFolderContext: () => mockContextValue,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PreviewPane — empty state', () => {
  beforeEach(() => {
    mockContextValue.selected = null;
  });

  it('renders the preview pane container', () => {
    render(<PreviewPane />);
    expect(screen.getByTestId('preview-pane')).toBeInTheDocument();
  });

  it('shows empty state message when no image is selected', () => {
    render(<PreviewPane />);
    expect(screen.getByTestId('preview-empty')).toBeInTheDocument();
    expect(screen.getByText('Select an image to preview')).toBeInTheDocument();
  });

  it('does not render img element when no image is selected', () => {
    render(<PreviewPane />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('PreviewPane — image selected', () => {
  beforeEach(() => {
    mockContextValue.selected = mockImage;
  });

  it('renders the image with src containing the encodedPath', () => {
    render(<PreviewPane />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining(mockImage.encodedPath));
  });

  it('sets alt text to the filename', () => {
    render(<PreviewPane />);
    const img = screen.getByAltText(mockImage.filename);
    expect(img).toBeInTheDocument();
  });

  it('shows the filename below the image', () => {
    render(<PreviewPane />);
    expect(screen.getByTestId('preview-filename')).toHaveTextContent(mockImage.filename);
  });

  it('shows the full file path below the filename', () => {
    render(<PreviewPane />);
    expect(screen.getByTestId('preview-filepath')).toHaveTextContent(mockImage.path);
  });

  it('does not show empty state when an image is selected', () => {
    render(<PreviewPane />);
    expect(screen.queryByTestId('preview-empty')).not.toBeInTheDocument();
  });
});

describe('PreviewPane — image load error', () => {
  beforeEach(() => {
    mockContextValue.selected = mockImage;
  });

  it('shows error message when image fails to load', () => {
    render(<PreviewPane />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.getByTestId('preview-error')).toBeInTheDocument();
    expect(screen.getByText('Image could not be loaded')).toBeInTheDocument();
  });

  it('hides the img element after a load error', () => {
    render(<PreviewPane />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
