import { useState } from 'react';
import type { FolderImage } from '@appystack/shared';
import { useDraggable } from '@dnd-kit/core';
import { useFolderContext } from '../contexts/FolderContext.js';
import { imageUrl } from '../utils/api.js';
import { useContextMenu } from '../hooks/useContextMenu.js';
import { useExclusion } from '../hooks/useExclusion.js';
import { ContextMenu } from './ContextMenu.js';

// ---------------------------------------------------------------------------
// UnsortedItem
// ---------------------------------------------------------------------------

interface UnsortedItemProps {
  image: FolderImage;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function UnsortedItem({ image, isSelected, onSelect, onContextMenu }: UnsortedItemProps) {
  const [imgError, setImgError] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: image.filename,
    data: { source: 'unsorted', image },
  });

  const itemClass = [
    'img-item',
    isSelected ? 'selected' : '',
    isDragging ? 'opacity-40' : '',
  ].filter(Boolean).join(' ');

  return (
    <li
      ref={setNodeRef}
      data-id={image.filename}
      className={itemClass}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      {...attributes}
      {...listeners}
      aria-selected={isSelected}
      role="option"
      style={{ paddingLeft: 10, cursor: 'grab' }}
    >
      <div className="img-thumb">
        {imgError ? (
          <div className="img-thumb-error" aria-label="Image unavailable" data-testid="thumb-error" />
        ) : (
          <img
            src={imageUrl(image.encodedPath)}
            alt={image.label}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      <span
        className="img-label"
        title={image.label}
        data-testid="item-label"
      >
        {image.label}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// UnsortedPane
// ---------------------------------------------------------------------------

export function UnsortedPane() {
  const { unsorted, selected, select, dir, reload } = useFolderContext();
  const { menu, openMenu, closeMenu } = useContextMenu();
  const { exclude } = useExclusion(dir, reload);

  return (
    <div data-testid="unsorted-pane" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="pane-header">
        <span className="pane-title">Unsorted</span>
        <span
          className={`pane-count${unsorted.length === 0 ? ' muted' : ''}`}
          data-testid="unsorted-header"
        >
          {unsorted.length}
        </span>
      </div>

      {unsorted.length === 0 ? (
        <div data-testid="unsorted-empty-state" className="pane-empty">
          No unsorted images
        </div>
      ) : (
        <ul
          role="listbox"
          aria-label="Unsorted images"
          style={{ margin: 0, padding: 0, listStyle: 'none' }}
        >
          {unsorted.map((image) => (
            <UnsortedItem
              key={image.encodedPath}
              image={image}
              isSelected={selected?.encodedPath === image.encodedPath}
              onSelect={() => select(image)}
              onContextMenu={(e) => openMenu(e, image)}
            />
          ))}
        </ul>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            {
              label: 'Exclude this image',
              onClick: () => { void exclude(menu.image.filename); },
              danger: true,
            },
          ]}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}

export default UnsortedPane;
