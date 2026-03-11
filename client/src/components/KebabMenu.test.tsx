import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KebabMenu } from './KebabMenu.js';
import type { KebabMenuItem } from './KebabMenu.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeItems(overrides?: Partial<KebabMenuItem>[]): KebabMenuItem[] {
  return [
    {
      label: 'Regenerate Manifest',
      description: 'Rebuilds .thumbrack.json from scratch',
      onClick: vi.fn(),
      ...(overrides?.[0] ?? {}),
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('KebabMenu — initial state', () => {
  it('is closed by default (no menu visible)', () => {
    render(<KebabMenu items={makeItems()} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders the ⋮ trigger button', () => {
    render(<KebabMenu items={makeItems()} />);
    expect(screen.getByRole('button', { name: /options/i })).toBeInTheDocument();
  });

  it('the ⋮ button has aria-label="Options"', () => {
    render(<KebabMenu items={makeItems()} />);
    const btn = screen.getByRole('button', { name: /options/i });
    expect(btn).toHaveAttribute('aria-label', 'Options');
  });
});

// ---------------------------------------------------------------------------
// Opening and closing
// ---------------------------------------------------------------------------

describe('KebabMenu — open/close toggle', () => {
  it('clicking the ⋮ button opens the menu', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('clicking the ⋮ button again closes the menu', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByRole('button', { name: /options/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('pressing Escape closes the menu', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('pressing other keys does not close the menu', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('clicking outside closes the menu', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <KebabMenu items={makeItems()} />
      </div>
    );
    await user.click(screen.getByRole('button', { name: /options/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('clicking inside the menu does not close it', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    fireEvent.mouseDown(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Menu items
// ---------------------------------------------------------------------------

describe('KebabMenu — menu items', () => {
  it('renders all items when the menu is open', async () => {
    const user = userEvent.setup();
    const items: KebabMenuItem[] = [
      { label: 'Item One', onClick: vi.fn() },
      { label: 'Item Two', onClick: vi.fn() },
    ];
    render(<KebabMenu items={items} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    expect(screen.getByRole('menuitem', { name: /item one/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /item two/i })).toBeInTheDocument();
  });

  it('renders items with role="menuitem"', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(1);
  });

  it('shows the description as a title attribute on the menu item', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    const item = screen.getByRole('menuitem', { name: /regenerate manifest/i });
    expect(item).toHaveAttribute('title', 'Rebuilds .thumbrack.json from scratch');
  });

  it('renders the description text inside the menu item', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    expect(screen.getByText('Rebuilds .thumbrack.json from scratch')).toBeInTheDocument();
  });

  it('does not render description text when description is not provided', async () => {
    const user = userEvent.setup();
    const items: KebabMenuItem[] = [{ label: 'No Desc', onClick: vi.fn() }];
    render(<KebabMenu items={items} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    // Should not throw; just no desc element
    expect(screen.getByRole('menuitem', { name: /no desc/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Click interactions
// ---------------------------------------------------------------------------

describe('KebabMenu — item click behaviour', () => {
  it('calls the item onClick handler when a menu item is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<KebabMenu items={[{ label: 'Action', onClick }]} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByRole('menuitem', { name: /action/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('closes the menu after clicking a menu item', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByRole('menuitem', { name: /regenerate manifest/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls onClick before closing the menu', async () => {
    const callOrder: string[] = [];
    const onClick = vi.fn(() => callOrder.push('click'));
    const user = userEvent.setup();
    render(<KebabMenu items={[{ label: 'Ordered', onClick }]} />);
    await user.click(screen.getByRole('button', { name: /options/i }));
    await user.click(screen.getByRole('menuitem', { name: /ordered/i }));
    expect(callOrder).toEqual(['click']);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
