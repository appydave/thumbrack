import { fetchManifest, saveManifest } from '../utils/api.js';

// ---------------------------------------------------------------------------
// useExclusion hook
// ---------------------------------------------------------------------------

export interface UseExclusionReturn {
  exclude: (filename: string) => Promise<void>;
  unexclude: (filename: string) => Promise<void>;
}

export function useExclusion(
  dir: string | null,
  reload: () => Promise<void>
): UseExclusionReturn {
  const exclude = async (filename: string): Promise<void> => {
    if (!dir) return;
    const manifest = await fetchManifest(dir);
    const excluded = Array.from(new Set([...manifest.excluded, filename]));
    await saveManifest(dir, { ...manifest, excluded });
    await reload();
  };

  const unexclude = async (filename: string): Promise<void> => {
    if (!dir) return;
    const manifest = await fetchManifest(dir);
    const excluded = manifest.excluded.filter((f) => f !== filename);
    await saveManifest(dir, { ...manifest, excluded });
    await reload();
  };

  return { exclude, unexclude };
}
