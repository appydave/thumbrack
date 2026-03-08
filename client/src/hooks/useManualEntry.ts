import { useState } from 'react';
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
 * - confirmEdit: validate, call renameImage, then reload
 * - cancelEdit: exit without saving
 */
export function useManualEntry(
  dir: string | null,
  reload: () => Promise<void>
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

    const filename = editingFilename;
    // Clear edit mode before the async call so the UI resets immediately
    setEditingFilename(null);
    setEditValue('');

    try {
      await renameImage({ dir, filename, newNumber: parsed });
      await reload();
    } catch {
      // Error handling: future work unit may add a toast here.
      // For now we silently swallow and the UI already exited edit mode.
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
