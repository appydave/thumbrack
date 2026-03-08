import { useState } from 'react';
import type { FolderImage } from '@appystack/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContextMenuState {
  x: number;
  y: number;
  image: FolderImage;
}

export interface UseContextMenuReturn {
  menu: ContextMenuState | null;
  openMenu: (e: React.MouseEvent, image: FolderImage) => void;
  closeMenu: () => void;
}

// ---------------------------------------------------------------------------
// useContextMenu hook
// ---------------------------------------------------------------------------

export function useContextMenu(): UseContextMenuReturn {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const openMenu = (e: React.MouseEvent, image: FolderImage) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, image });
  };

  const closeMenu = () => setMenu(null);

  return { menu, openMenu, closeMenu };
}
