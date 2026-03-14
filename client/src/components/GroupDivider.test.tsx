import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupDivider } from './GroupDivider.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GroupDivider — rendering', () => {
  it('renders without crashing', () => {
    const onRemove = vi.fn();
    render(<GroupDivider onRemove={onRemove} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('has role="separator" on the wrapper', () => {
    const onRemove = vi.fn();
    render(<GroupDivider onRemove={onRemove} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('has aria-label="Remove divider" on the button', () => {
    const onRemove = vi.fn();
    render(<GroupDivider onRemove={onRemove} />);
    expect(screen.getByRole('button', { name: 'Remove divider' })).toBeInTheDocument();
  });
});

describe('GroupDivider — interaction', () => {
  it('calls onRemove when × button is clicked', () => {
    const onRemove = vi.fn();
    render(<GroupDivider onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove divider' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
