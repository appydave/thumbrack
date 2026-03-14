import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ManifestData } from '@appystack/shared';

const MANIFEST_FILENAME = '.thumbrack.json';

const EMPTY_MANIFEST: ManifestData = {
  excluded: [],
  lastViewed: null,
  groupBoundaries: [],
};

export async function readManifest(dir: string): Promise<ManifestData> {
  const manifestPath = join(dir, MANIFEST_FILENAME);
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'excluded' in parsed &&
      Array.isArray((parsed as Record<string, unknown>).excluded)
    ) {
      const data = parsed as Record<string, unknown>;
      return {
        excluded: (data.excluded as unknown[]).filter((e): e is string => typeof e === 'string'),
        lastViewed: typeof data.lastViewed === 'string' ? data.lastViewed : null,
        groupBoundaries: Array.isArray(data.groupBoundaries)
          ? (data.groupBoundaries as unknown[]).filter((e): e is string => typeof e === 'string')
          : [],
      };
    }
    return { ...EMPTY_MANIFEST };
  } catch (err) {
    // File not found or malformed JSON — return empty manifest
    if (
      err instanceof SyntaxError ||
      (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT')
    ) {
      return { ...EMPTY_MANIFEST };
    }
    throw err;
  }
}

export async function writeManifest(dir: string, data: ManifestData): Promise<void> {
  const manifestPath = join(dir, MANIFEST_FILENAME);
  await writeFile(manifestPath, JSON.stringify(data, null, 2), 'utf-8');
}
