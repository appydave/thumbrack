import { useFolderContext } from '../contexts/FolderContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { fetchManifest, saveManifest } from '../utils/api.js';

// ---------------------------------------------------------------------------
// useDividers hook
// ---------------------------------------------------------------------------

export interface UseDividersReturn {
  addDivider: (filename: string) => Promise<void>;
  removeDivider: (filename: string) => Promise<void>;
}

export function useDividers(): UseDividersReturn {
  const { dir, reload } = useFolderContext();
  const { addToast } = useToast();

  const addDivider = async (filename: string): Promise<void> => {
    try {
      const manifest = await fetchManifest(dir!);
      manifest.groupBoundaries = [...(manifest.groupBoundaries ?? []), filename];
      await saveManifest(dir!, manifest);
      await reload();
    } catch {
      addToast('Failed to add divider', 'error');
    }
  };

  const removeDivider = async (filename: string): Promise<void> => {
    try {
      const manifest = await fetchManifest(dir!);
      manifest.groupBoundaries = (manifest.groupBoundaries ?? []).filter((f) => f !== filename);
      await saveManifest(dir!, manifest);
      await reload();
    } catch {
      addToast('Failed to remove divider', 'error');
    }
  };

  return { addDivider, removeDivider };
}
