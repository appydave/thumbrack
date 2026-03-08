import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import type { FolderImage } from '@appystack/shared';
import { reorderImages, renameImage } from '../utils/api.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseDragDropOptions {
  dir: string | null;
  sorted: FolderImage[];
  unsorted: FolderImage[];
  reload: () => Promise<void>;
}

export interface UseDragDropReturn {
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  activeId: string | null;
  overId: string | null;
}

// ---------------------------------------------------------------------------
// useDragDrop hook
// ---------------------------------------------------------------------------

export function useDragDrop({
  dir,
  sorted,
  unsorted,
  reload,
}: UseDragDropOptions): UseDragDropReturn {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    setActiveId(active.id as string);
    setOverId(over ? (over.id as string) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset visual state
      setActiveId(null);
      setOverId(null);

      // No-op if no dir set
      if (!dir) return;

      // No-op if not dropped over anything
      if (!over) return;

      const activeFilename = active.id as string;
      const overFilename = over.id as string;

      // No-op if dropped in same place
      if (activeFilename === overFilename) return;

      // Determine if the active item is from the sorted or unsorted list
      const activeIsSorted = sorted.some((img) => img.filename === activeFilename);
      const activeIsUnsorted = unsorted.some((img) => img.filename === activeFilename);

      if (activeIsSorted) {
        // Reorder within sorted list
        const oldIndex = sorted.findIndex((img) => img.filename === activeFilename);
        const newIndex = sorted.findIndex((img) => img.filename === overFilename);

        // If the over item is not in the sorted list, bail
        if (newIndex === -1) return;

        const reordered = arrayMove(sorted, oldIndex, newIndex);
        const newOrder = reordered.map((img) => img.filename);

        reorderImages({ dir, order: newOrder })
          .then(() => reload())
          .catch(() => reload());
      } else if (activeIsUnsorted) {
        // Drop unsorted item into sorted list at a specific position
        const targetIndex = sorted.findIndex((img) => img.filename === overFilename);

        // If the target is not in the sorted list, bail
        if (targetIndex === -1) return;

        // Position is 1-indexed
        const newNumber = targetIndex + 1;

        renameImage({ dir, filename: activeFilename, newNumber })
          .then(() => reload())
          .catch(() => reload());
      }
    },
    [dir, sorted, unsorted, reload]
  );

  return {
    handleDragEnd,
    handleDragOver,
    activeId,
    overId,
  };
}
