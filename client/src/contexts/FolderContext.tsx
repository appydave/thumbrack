import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { FolderImage } from '@appystack/shared';
import { fetchFolder } from '../utils/api.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FolderContextValue {
  dir: string | null;
  sorted: FolderImage[];
  unsorted: FolderImage[];
  excluded: FolderImage[];
  selected: FolderImage | null;
  loading: boolean;
  error: string | null;
  loadFolder: (path: string) => Promise<void>;
  reload: () => Promise<void>;
  select: (image: FolderImage | null) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const FolderContext = createContext<FolderContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FolderProvider({ children }: { children: ReactNode }) {
  const [dir, setDir] = useState<string | null>(null);
  const [sorted, setSorted] = useState<FolderImage[]>([]);
  const sortedRef = useRef<FolderImage[]>([]);
  const [unsorted, setUnsorted] = useState<FolderImage[]>([]);
  const [excluded, setExcluded] = useState<FolderImage[]>([]);
  const [selected, setSelected] = useState<FolderImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolder = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFolder(path);
      setDir(data.dir);
      setSorted(data.sorted);
      sortedRef.current = data.sorted;
      setUnsorted(data.unsorted);
      setExcluded(data.excluded);
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    if (!dir) return;
    const previousFilename = selected?.filename ?? null;
    await loadFolder(dir);
    if (previousFilename !== null) {
      // loadFolder resets selected to null; restore the selection from the refreshed list.
      // sortedRef.current holds the updated list synchronously after loadFolder resolves.
      const match = sortedRef.current.find((img) => img.filename === previousFilename) ?? null;
      setSelected(match);
    }
  }, [dir, selected, loadFolder]);

  const select = useCallback(
    (image: FolderImage | null) => {
      setSelected(image);
      // Fire-and-forget: update lastViewed in the manifest (best effort)
      if (image) {
        // We import lazily inside the callback to avoid circular deps at module level
        import('../utils/api.js')
          .then(({ fetchManifest, saveManifest }) => {
            if (!dir) return;
            fetchManifest(dir)
              .then((manifest) => saveManifest(dir, { ...manifest, lastViewed: image.filename }))
              .catch(() => {
                // silently ignore — this is best-effort
              });
          })
          .catch(() => {
            // silently ignore
          });
      }
    },
    [dir]
  );

  const value: FolderContextValue = {
    dir,
    sorted,
    unsorted,
    excluded,
    selected,
    loading,
    error,
    loadFolder,
    reload,
    select,
  };

  return <FolderContext.Provider value={value}>{children}</FolderContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFolderContext(): FolderContextValue {
  const ctx = useContext(FolderContext);
  if (!ctx) {
    throw new Error('useFolderContext must be used within a FolderProvider');
  }
  return ctx;
}
