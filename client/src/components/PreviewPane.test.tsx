import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FolderImage } from '@appystack/shared';
import { PreviewPane } from './PreviewPane.js';

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
    localStorageMock.clear();
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
    localStorageMock.clear();
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
    localStorageMock.clear();
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

// ---------------------------------------------------------------------------
// Zoom mode tests
// ---------------------------------------------------------------------------

describe('PreviewPane — zoom mode (default)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockContextValue.selected = mockImage;
  });

  it('defaults to fit mode', () => {
    render(<PreviewPane />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-zoom', 'fit');
  });

  it('renders all three zoom buttons', () => {
    render(<PreviewPane />);
    expect(screen.getByTestId('zoom-btn-fit')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-btn-fill')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-btn-actual')).toBeInTheDocument();
  });

  it('fit button is initially pressed', () => {
    render(<PreviewPane />);
    expect(screen.getByTestId('zoom-btn-fit')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('zoom-btn-fill')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('zoom-btn-actual')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('PreviewPane — zoom mode toggling', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockContextValue.selected = mockImage;
  });

  it('clicking Fill sets zoom mode to fill', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-fill'));
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-zoom', 'fill');
  });

  it('clicking Actual sets zoom mode to actual', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-actual'));
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-zoom', 'actual');
  });

  it('clicking Fit returns to fit mode from fill', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-fill'));
    fireEvent.click(screen.getByTestId('zoom-btn-fit'));
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-zoom', 'fit');
  });

  it('clicking Fit returns to fit mode from actual', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-actual'));
    fireEvent.click(screen.getByTestId('zoom-btn-fit'));
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-zoom', 'fit');
  });
});

describe('PreviewPane — zoom mode aria-pressed state', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockContextValue.selected = mockImage;
  });

  it('fill button is pressed after clicking Fill', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-fill'));
    expect(screen.getByTestId('zoom-btn-fill')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('zoom-btn-fit')).toHaveAttribute('aria-pressed', 'false');
  });

  it('actual button is pressed after clicking Actual', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-actual'));
    expect(screen.getByTestId('zoom-btn-actual')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('zoom-btn-fit')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('PreviewPane — zoom mode localStorage persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockContextValue.selected = mockImage;
  });

  it('persists zoom mode to localStorage when changed to fill', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-fill'));
    expect(localStorageMock.getItem('thumbrack:previewZoom')).toBe(JSON.stringify('fill'));
  });

  it('persists zoom mode to localStorage when changed to actual', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-actual'));
    expect(localStorageMock.getItem('thumbrack:previewZoom')).toBe(JSON.stringify('actual'));
  });

  it('persists zoom mode to localStorage when changed to fit', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-actual'));
    fireEvent.click(screen.getByTestId('zoom-btn-fit'));
    expect(localStorageMock.getItem('thumbrack:previewZoom')).toBe(JSON.stringify('fit'));
  });

  it('reads zoom mode from localStorage on mount', () => {
    localStorageMock.setItem('thumbrack:previewZoom', JSON.stringify('fill'));
    render(<PreviewPane />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-zoom', 'fill');
  });

  it('reads actual zoom mode from localStorage on mount', () => {
    localStorageMock.setItem('thumbrack:previewZoom', JSON.stringify('actual'));
    render(<PreviewPane />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-zoom', 'actual');
  });

  it('falls back to fit when localStorage has invalid value', () => {
    localStorageMock.setItem('thumbrack:previewZoom', 'not-valid-json{{{');
    render(<PreviewPane />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-zoom', 'fit');
  });
});

describe('PreviewPane — zoom mode actual container overflow', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockContextValue.selected = mockImage;
  });

  it('container has overflow:auto in actual mode', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-actual'));
    const wrap = screen.getByTestId('preview-image-wrap');
    expect(wrap).toHaveStyle({ overflow: 'auto' });
  });

  it('container does not have overflow:auto in fit mode', () => {
    render(<PreviewPane />);
    const wrap = screen.getByTestId('preview-image-wrap');
    expect(wrap).not.toHaveStyle({ overflow: 'auto' });
  });

  it('container does not have overflow:auto in fill mode', () => {
    render(<PreviewPane />);
    fireEvent.click(screen.getByTestId('zoom-btn-fill'));
    const wrap = screen.getByTestId('preview-image-wrap');
    expect(wrap).not.toHaveStyle({ overflow: 'auto' });
  });
});
