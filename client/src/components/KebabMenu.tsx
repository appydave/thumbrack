import { useState, useRef, useEffect } from 'react';

export interface KebabMenuItem {
  label: string;
  description?: string;
  onClick: () => void;
}

export interface KebabMenuProps {
  items: KebabMenuItem[];
}

export function KebabMenu({ items }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div ref={ref} className="kebab-menu-root">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Options"
        title="Options"
        className="btn-kebab"
      >
        ⋮
      </button>
      {open && (
        <div role="menu" className="kebab-menu-dropdown">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              title={item.description}
              className="kebab-menu-item"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              <span className="kebab-menu-item-label">{item.label}</span>
              {item.description && (
                <span className="kebab-menu-item-desc">{item.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default KebabMenu;
