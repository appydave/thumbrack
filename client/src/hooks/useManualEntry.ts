import { useState } from 'react';
import type { FolderImage } from '@appystack/shared';
import { renameImage } from '../utils/api.js';

// ---------------------------------------------------------------------------
// useManualEntry
// ---------------------------------------------------------------------------

export interface UseManualEntryReturn {
  editingFilename: string | null;
  editValue: string;
  setEditValue: (value: string) => void;
  startEdit: (filename: string, currentNumber: number) => void;
  confirmEdit: () => Promise<void>;
  cancelEdit: () => void;
}

/**
 * Manages inline number-editing state for sorted images.
 *
 * - startEdit: enter edit mode for a specific file
 * - confirmEdit: validate, collision-check, call renameImage, then reload
 * - cancelEdit: exit without saving
 */
export function useManualEntry(
  dir: string | null,
  reload: () => Promise<void>,
  sorted: FolderImage[],
  onError: (msg: string) => void,
): UseManualEntryReturn {
  const [editingFilename, setEditingFilename] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (filename: string, currentNumber: number) => {
    setEditingFilename(filename);
    setEditValue(String(currentNumber));
  };

  const confirmEdit = async () => {
    if (!editingFilename || !dir) {
      setEditingFilename(null);
      setEditValue('');
      return;
    }

    const parsed = parseInt(editValue, 10);

    // Validate: must be an integer in range 1–99
    if (isNaN(parsed) || parsed < 1 || parsed > 99) {
      setEditingFilename(null);
      setEditValue('');
      return;
    }

    // Collision check: block if another image already has this number
    const occupant = sorted.find(
      (img) => img.number === parsed && img.filename !== editingFilename
    );
    if (occupant) {
      onError(`Number ${String(parsed).padStart(2, '0')} is already taken`);
      setEditingFilename(null);
      setEditValue('');
      return;
    }

    const filename = editingFilename;
    setEditingFilename(null);
    setEditValue('');

    try {
      await renameImage({ dir, filename, newNumber: parsed });
      await reload();
    } catch {
      onError('Rename failed');
    }
  };

  const cancelEdit = () => {
    setEditingFilename(null);
    setEditValue('');
  };

  return {
    editingFilename,
    editValue,
    setEditValue,
    startEdit,
    confirmEdit,
    cancelEdit,
  };
}
