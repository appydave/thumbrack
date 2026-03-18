import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FolderImage } from '@appystack/shared';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFolderContext } from '../contexts/FolderContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { imageUrl } from '../utils/api.js';
import { useDragDrop } from '../hooks/useDragDrop.js';
import { useManualEntry } from '../hooks/useManualEntry.js';
import { useKeyboardNav } from '../hooks/useKeyboardNav.js';
import { useContextMenu } from '../hooks/useContextMenu.js';
import { useExclusion } from '../hooks/useExclusion.js';
import { useDividers } from '../hooks/useDividers.js';
import { ContextMenu } from './ContextMenu.js';
import { GroupDivider } from './GroupDivider.js';

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

  // Scroll into view when this item becomes selected (keyboard navigation)
  const nodeRef = useRef<HTMLLIElement | null>(null);
  const setCombinedRef = useCallback(
    (node: HTMLLIElement | null) => {
      nodeRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef]
  );

  useEffect(() => {
    if (isSelected && nodeRef.current) {
      nodeRef.current.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

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
      ref={setCombinedRef}
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
// SortableDivider
// ---------------------------------------------------------------------------

function SortableDivider({
  anchorFilename,
  onRemove,
}: {
  anchorFilename: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `__div:${anchorFilename}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    // attributes on the li for a11y; listeners only on the line inside GroupDivider
    // so the × button click is never intercepted by the drag handlers
    <li ref={setNodeRef} style={style} {...attributes} role="presentation">
      <GroupDivider onRemove={onRemove} dragHandleProps={listeners} />
    </li>
  );
}

// ---------------------------------------------------------------------------
// SortedPane
// ---------------------------------------------------------------------------

export function SortedPane() {
  const { sorted, unsorted, selected, select, dir, reload, groupBoundaries } = useFolderContext();
  const { addToast } = useToast();
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);
  const { menu, openMenu, closeMenu } = useContextMenu();
  const { exclude } = useExclusion(dir, reload);
  const { addDivider, removeDivider, moveDivider } = useDividers();
  const { editingFilename, editValue, setEditValue, startEdit, confirmEdit, cancelEdit } =
    useManualEntry(dir, reload, sorted, (msg) => addToast(msg, 'error'));

  useKeyboardNav(startEdit);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { handleDragEnd, handleDragOver, overId } = useDragDrop({
    dir,
    sorted,
    unsorted,
    reload,
  });

  // Interleave divider IDs with image IDs so dividers are sortable items.
  // Divider IDs use the prefix "__div:" to distinguish them from filenames.
  const DIVIDER_PREFIX = '__div:';
  const sortedItems = sorted.flatMap((img) => {
    const items: string[] = [];
    if (groupBoundaries.includes(img.filename)) {
      items.push(`${DIVIDER_PREFIX}${img.filename}`);
    }
    items.push(img.filename);
    return items;
  });

  const handleDragStart = (event: DragStartEvent) => {
    setLocalActiveId(event.active.id as string);
  };

  const handleDragEndWrapped = (event: Parameters<typeof handleDragEnd>[0]) => {
    setLocalActiveId(null);

    const activeId = event.active.id as string;
    const overId = event.over?.id as string | undefined;

    if (activeId.startsWith('__div:') && overId) {
      const oldAnchor = activeId.slice('__div:'.length);
      // Find the first image ID at or after the drop target
      const overIndex = sortedItems.indexOf(overId);
      let newAnchor: string | null = null;
      for (let i = overIndex; i < sortedItems.length; i++) {
        if (!sortedItems[i].startsWith('__div:')) {
          newAnchor = sortedItems[i];
          break;
        }
      }
      // Refuse to anchor divider before the very first item (position 0 is useless)
      if (!newAnchor || newAnchor === sorted[0]?.filename || newAnchor === oldAnchor) return;
      void moveDivider(oldAnchor, newAnchor);
      return;
    }

    // If an image was dragged and landed ON a divider element, resolve the divider
    // to its anchor filename so the reorder proceeds as if it dropped on that image.
    // Without this, the divider acts as a wall — sorted.findIndex returns -1 and bails.
    //
    // Special case: if the anchor item drags onto its OWN divider (anchor === activeId),
    // the divider is stuck at position 0 with nowhere to go. Auto-remove it so the
    // user isn't left completely stuck.
    let resolvedEvent = event;
    if (!activeId.startsWith('__div:') && overId?.startsWith('__div:')) {
      const anchorFilename = overId.slice('__div:'.length);

      if (anchorFilename === activeId) {
        // The anchor item dragged onto its own divider.
        // The user wants to "join the group above" — they don't want to move the item,
        // they want the divider to slide past them to the next item.
        // Action: reanchor divider to the next item after the anchor (no reorder needed).
        const dividerIndex = sortedItems.indexOf(overId);

        // Check if there's any item above the divider — if not it's at position 0, just remove
        let hasItemAbove = false;
        for (let i = dividerIndex - 1; i >= 0; i--) {
          if (!sortedItems[i].startsWith('__div:')) {
            hasItemAbove = true;
            break;
          }
        }
        if (!hasItemAbove) {
          void removeDivider(anchorFilename);
          return;
        }

        // Find the next image after the anchor to become the new divider anchor
        const anchorIndex = sortedItems.indexOf(activeId);
        let nextAfterAnchor: string | null = null;
        for (let i = anchorIndex + 1; i < sortedItems.length; i++) {
          if (!sortedItems[i].startsWith('__div:')) {
            nextAfterAnchor = sortedItems[i];
            break;
          }
        }

        if (!nextAfterAnchor) {
          // Anchor is last item — divider at the end is useless, remove it
          void removeDivider(anchorFilename);
        } else {
          // Reanchor: divider slides past the anchor to the next item
          void moveDivider(anchorFilename, nextAfterAnchor);
        }
        return; // no reorder — anchor stays in its current position
      } else {
        resolvedEvent = {
          ...event,
          over: event.over ? { ...event.over, id: anchorFilename } : null,
        };
      }
    }

    handleDragEnd(resolvedEvent);
  };

  const activeImage =
    localActiveId !== null && !localActiveId.startsWith('__div:')
      ? (sorted.find((img) => img.filename === localActiveId) ??
        unsorted.find((img) => img.filename === localActiveId) ??
        null)
      : null;

  const activeIsDivider = localActiveId?.startsWith(DIVIDER_PREFIX) ?? false;

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
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEndWrapped}
        >
          <SortableContext items={sortedItems} strategy={verticalListSortingStrategy}>
            <ul
              role="listbox"
              aria-label="Sorted images"
              style={{ margin: 0, padding: 0, listStyle: 'none' }}
            >
              {sortedItems.map((id) => {
                if (id.startsWith(DIVIDER_PREFIX)) {
                  const anchorFilename = id.slice(DIVIDER_PREFIX.length);
                  return (
                    <SortableDivider
                      key={id}
                      anchorFilename={anchorFilename}
                      onRemove={() => void removeDivider(anchorFilename)}
                    />
                  );
                }
                const image = sorted.find((img) => img.filename === id)!;
                return (
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
                );
              })}
            </ul>
          </SortableContext>

          <DragOverlay>
            {activeIsDivider ? (
              <div className="group-divider group-divider--dragging">
                <div className="group-divider__line" />
              </div>
            ) : activeImage ? (
              <DragOverlayItem image={activeImage} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            groupBoundaries.includes(menu.image.filename)
              ? {
                  label: 'Remove divider',
                  onClick: () => {
                    void removeDivider(menu.image.filename);
                  },
                }
              : {
                  label: 'Add divider before this',
                  onClick: () => {
                    void addDivider(menu.image.filename);
                  },
                },
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
