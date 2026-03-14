import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu } from './ContextMenu.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const defaultProps = {
  x: 100,
  y: 200,
  items: [
    { label: 'Item One', onClick: vi.fn() },
    { label: 'Item Two', onClick: vi.fn(), danger: true },
  ],
  onClose: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContextMenu — rendering', () => {
  it('renders at the correct position', () => {
    render(<ContextMenu {...defaultProps} />);
    const menu = screen.getByTestId('context-menu');
    expect(menu).toHaveStyle({ top: '200px', left: '100px' });
  });

  it('renders all items', () => {
    render(<ContextMenu {...defaultProps} />);
    expect(screen.getByText('Item One')).toBeInTheDocument();
    expect(screen.getByText('Item Two')).toBeInTheDocument();
  });

  it('renders danger items in red', () => {
    render(<ContextMenu {...defaultProps} />);
    const dangerItem = screen.getByText('Item Two');
    expect(dangerItem.className).toContain('danger');
  });

  it('renders non-danger items in normal color', () => {
    render(<ContextMenu {...defaultProps} />);
    const normalItem = screen.getByText('Item One');
    expect(normalItem.className).not.toContain('danger');
  });

  it('renders with role="menu"', () => {
    render(<ContextMenu {...defaultProps} />);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('renders items with role="menuitem"', () => {
    render(<ContextMenu {...defaultProps} />);
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(2);
  });
});

describe('ContextMenu — item click', () => {
  it('calls the item onClick when an item is clicked', () => {
    const onClick = vi.fn();
    render(<ContextMenu x={0} y={0} items={[{ label: 'Click me', onClick }]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onClose when an item is clicked', () => {
    const onClose = vi.fn();
    render(
      <ContextMenu
        x={0}
        y={0}
        items={[{ label: 'Click me', onClick: vi.fn() }]}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('ContextMenu — keyboard Escape', () => {
  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<ContextMenu {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose for other keys', () => {
    const onClose = vi.fn();
    render(<ContextMenu {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ContextMenu — click outside', () => {
  it('calls onClose when clicking outside the menu', () => {
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ContextMenu {...defaultProps} onClose={onClose} />
      </div>
    );
    fireEvent.click(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when clicking inside the menu', () => {
    const onClose = vi.fn();
    render(<ContextMenu {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('context-menu'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
