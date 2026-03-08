import { useEffect } from 'react';
import { useFolderContext } from '../contexts/FolderContext.js';

// ---------------------------------------------------------------------------
// useKeyboardNav
// ---------------------------------------------------------------------------

/**
 * Attaches a keydown listener to the document and handles keyboard navigation
 * across the sorted and unsorted image lists.
 *
 * Keys handled:
 *  - ArrowDown / ArrowUp — navigate between items in sorted then unsorted
 *  - F2 / e — trigger manual-entry edit mode for the selected sorted item
 *
 * All keys are ignored when the active element is an INPUT (so the user can
 * type freely in the directory path input or number-edit input).
 *
 * @param startEdit - callback from useManualEntry; called to enter edit mode
 */
export function useKeyboardNav(
  startEdit: (filename: string, number: number) => void,
): void {
  const { sorted, unsorted, selected, select } = useFolderContext();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Do not intercept when the user is typing in an input field
      if (document.activeElement?.tagName === 'INPUT') return;

      const key = e.key;

      if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();

        const sortedIdx = selected
          ? sorted.findIndex((img) => img.encodedPath === selected.encodedPath)
          : -1;
        const unsortedIdx = selected
          ? unsorted.findIndex((img) => img.encodedPath === selected.encodedPath)
          : -1;

        if (key === 'ArrowDown') {
          if (selected === null) {
            // Nothing selected — pick first sorted, or first unsorted
            if (sorted.length > 0) {
              select(sorted[0]);
            } else if (unsorted.length > 0) {
              select(unsorted[0]);
            }
          } else if (sortedIdx !== -1) {
            // Currently in sorted list
            if (sortedIdx < sorted.length - 1) {
              // Move to next sorted item
              select(sorted[sortedIdx + 1]);
            } else if (unsorted.length > 0) {
              // Wrap from last sorted to first unsorted
              select(unsorted[0]);
            }
            // else: already at last sorted with no unsorted — stay put
          } else if (unsortedIdx !== -1) {
            // Currently in unsorted list
            if (unsortedIdx < unsorted.length - 1) {
              select(unsorted[unsortedIdx + 1]);
            }
            // else: at last unsorted — stay put
          }
        } else {
          // ArrowUp
          if (selected === null) {
            // Nothing selected — pick first sorted, or first unsorted
            if (sorted.length > 0) {
              select(sorted[0]);
            } else if (unsorted.length > 0) {
              select(unsorted[0]);
            }
          } else if (unsortedIdx !== -1) {
            // Currently in unsorted list
            if (unsortedIdx > 0) {
              select(unsorted[unsortedIdx - 1]);
            } else if (sorted.length > 0) {
              // Wrap from first unsorted to last sorted
              select(sorted[sorted.length - 1]);
            }
            // else: no sorted items — stay at first unsorted
          } else if (sortedIdx !== -1) {
            // Currently in sorted list
            if (sortedIdx > 0) {
              select(sorted[sortedIdx - 1]);
            }
            // else: already at first sorted — stay put
          }
        }

        return;
      }

      if (key === 'F2' || key === 'e') {
        if (
          selected !== null &&
          selected.number !== null &&
          sorted.some((img) => img.encodedPath === selected.encodedPath)
        ) {
          startEdit(selected.filename, selected.number);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sorted, unsorted, selected, select, startEdit]);
}
