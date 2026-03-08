import { useState } from 'react';
import type { FolderImage } from '@appystack/shared';
import { useFolderContext } from '../contexts/FolderContext.js';
import { imageUrl } from '../utils/api.js';
import { useContextMenu } from '../hooks/useContextMenu.js';
import { useExclusion } from '../hooks/useExclusion.js';
import { ContextMenu } from './ContextMenu.js';

// ---------------------------------------------------------------------------
// ExcludedItem
// ---------------------------------------------------------------------------

interface ExcludedItemProps {
  image: FolderImage;
  onContextMenu: (e: React.MouseEvent) => void;
}

function ExcludedItem({ image, onContextMenu }: ExcludedItemProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <li
      data-id={image.filename}
      data-testid="excluded-item"
      className="img-item excluded-item"
      onContextMenu={onContextMenu}
      role="option"
      aria-selected={false}
      style={{ paddingLeft: 10 }}
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
// ExcludedPane
// ---------------------------------------------------------------------------

export function ExcludedPane() {
  const { excluded, dir, reload } = useFolderContext();
  const { menu, openMenu, closeMenu } = useContextMenu();
  const { unexclude } = useExclusion(dir, reload);

  if (excluded.length === 0) return null;

  return (
    <div data-testid="excluded-pane" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="pane-header">
        <span className="pane-title">Excluded</span>
        <span className="pane-count muted" data-testid="excluded-header">
          {excluded.length}
        </span>
      </div>

      <ul
        role="listbox"
        aria-label="Excluded images"
        style={{ margin: 0, padding: 0, listStyle: 'none' }}
      >
        {excluded.map((image) => (
          <ExcludedItem
            key={image.encodedPath}
            image={image}
            onContextMenu={(e) => openMenu(e, image)}
          />
        ))}
      </ul>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            {
              label: 'Un-exclude',
              onClick: () => { void unexclude(menu.image.filename); },
            },
          ]}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}

export default ExcludedPane;
