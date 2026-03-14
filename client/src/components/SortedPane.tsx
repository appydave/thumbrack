import { useEffect, useRef, useState } from 'react';
import type { FolderImage } from '@appystack/shared';
import { DndContext, closestCenter, DragOverlay, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFolderContext } from '../contexts/FolderContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { imageUrl } from '../utils/api.js';
import { useDragDrop } from '../hooks/useDragDrop.js';
import { useManualEntry } from '../hooks/useManualEntry.js';
import { useKeyboardNav } from '../hooks/useKeyboardNav.js';
import { useContextMenu } from '../hooks/useContextMenu.js';
import { useExclusion } from '../hooks/useExclusion.js';
import { ContextMenu } from './ContextMenu.js';

// ---------------------------------------------------------------------------
// SortableItem
// ---------------------------------------------------------------------------

interface SortedItemProps {
  image: FolderImage;
  isSelected: boolean;
  onSelect: () => void;
  isOver: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onBadgeClick: () => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

function SortableItem({
  image,
  isSelected,
  onSelect,
  isOver,
  onContextMenu,
  isEditing,
  editValue,
  onEditValueChange,
  onBadgeClick,
  onConfirm,
  onCancel,
}: SortedItemProps) {
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.filename,
  });

  const numberBadge = image.number !== null ? String(image.number).padStart(2, '0') : '--';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void onConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const itemClass = [
    'img-item',
    isSelected ? 'selected' : '',
    isOver ? 'is-over' : '',
    isDragging ? 'drag-source' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={itemClass}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      aria-selected={isSelected}
      role="option"
    >
      {/* Drag handle */}
      <div className="drag-handle" title="Drag to reorder" aria-label="Drag handle">
        ⠿
      </div>

      {/* Thumbnail */}
      <div className="img-thumb">
        {imgError ? (
          <div
            className="img-thumb-error"
            aria-label="Image unavailable"
            data-testid="thumb-error"
          />
        ) : (
          <img
            src={imageUrl(image.encodedPath)}
            alt={image.label}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Number badge / edit input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={onCancel}
          onClick={(e) => e.stopPropagation()}
          className="num-input"
          data-testid="number-input"
          aria-label="Enter new number"
        />
      ) : (
        <span
          className={`num-badge${image.number === null ? ' placeholder' : ''}`}
          data-testid="number-badge"
          onClick={(e) => {
            e.stopPropagation();
            onBadgeClick();
          }}
          title="Click to edit number"
        >
          {numberBadge}
        </span>
      )}

      {/* Label */}
      <span className="img-label" title={image.label} data-testid="item-label">
        {image.label}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// DragOverlayItem
// ---------------------------------------------------------------------------

function DragOverlayItem({ image }: { image: FolderImage }) {
  const [imgError, setImgError] = useState(false);
  const numberBadge = image.number !== null ? String(image.number).padStart(2, '0') : '--';

  return (
    <div className="drag-overlay">
      <div className="img-thumb" style={{ width: 40, height: 40 }}>
        {imgError ? (
          <div className="img-thumb-error" />
        ) : (
          <img
            src={imageUrl(image.encodedPath)}
            alt={image.label}
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <span className="num-badge">{numberBadge}</span>
      <span className="img-label">{image.label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortedPane
// ---------------------------------------------------------------------------

export function SortedPane() {
  const { sorted, unsorted, selected, select, dir, reload } = useFolderContext();
  const { addToast } = useToast();
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const { menu, openMenu, closeMenu } = useContextMenu();
  const { exclude } = useExclusion(dir, reload);
  const { editingFilename, editValue, setEditValue, startEdit, confirmEdit, cancelEdit } =
    useManualEntry(dir, reload, sorted, (msg) => addToast(msg, 'error'));

  useKeyboardNav(startEdit);

  const { handleDragEnd, handleDragOver, overId } = useDragDrop({
    dir,
    sorted,
    unsorted,
    reload,
  });

  const handleDragStart = (event: DragStartEvent) => {
    setLocalActiveId(event.active.id as string);
  };

  const handleDragEndWrapped = (event: Parameters<typeof handleDragEnd>[0]) => {
    setLocalActiveId(null);
    handleDragEnd(event);
  };

  const activeImage =
    localActiveId !== null
      ? (sorted.find((img) => img.filename === localActiveId) ??
        unsorted.find((img) => img.filename === localActiveId) ??
        null)
      : null;

  const sortedIds = sorted.map((img) => img.filename);

  return (
    <div data-testid="sorted-pane" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="pane-header">
        <span className="pane-title">Sorted</span>
        <span className="pane-count" data-testid="sorted-header">
          {sorted.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div data-testid="empty-state" className="pane-empty">
          No numbered images
        </div>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEndWrapped}
        >
          <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
            <ul
              role="listbox"
              aria-label="Sorted images"
              style={{ margin: 0, padding: 0, listStyle: 'none' }}
            >
              {sorted.map((image) => (
                <SortableItem
                  key={image.encodedPath}
                  image={image}
                  isSelected={selected?.encodedPath === image.encodedPath}
                  onSelect={() => select(image)}
                  isOver={overId === image.filename && localActiveId !== image.filename}
                  onContextMenu={(e) => openMenu(e, image)}
                  isEditing={editingFilename === image.filename}
                  editValue={editValue}
                  onEditValueChange={setEditValue}
                  onBadgeClick={() => {
                    if (image.number !== null) {
                      startEdit(image.filename, image.number);
                    }
                  }}
                  onConfirm={confirmEdit}
                  onCancel={cancelEdit}
                />
              ))}
            </ul>
          </SortableContext>

          <DragOverlay>{activeImage ? <DragOverlayItem image={activeImage} /> : null}</DragOverlay>
        </DndContext>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            {
              label: 'Exclude this image',
              onClick: () => {
                void exclude(menu.image.filename);
              },
              danger: true,
            },
          ]}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}

export default SortedPane;
