import { Router } from 'express';
import { stat, readdir } from 'node:fs/promises';
import type { ManifestData } from '@appystack/shared';
import { apiSuccess, apiFailure } from '../helpers/response.js';
import { readManifest, writeManifest } from '../helpers/manifestHelpers.js';

const router = Router();

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

function hasImageExtension(filename: string): boolean {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return false;
  return IMAGE_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

async function directoryExists(dir: string): Promise<boolean> {
  try {
    const s = await stat(dir);
    return s.isDirectory();
  } catch {
    return false;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((e) => typeof e === 'string');
}

// GET /api/manifest?dir=
router.get('/', async (req, res) => {
  const dir = req.query['dir'];
  if (typeof dir !== 'string' || dir.trim() === '') {
    apiFailure(res, 'Missing required query parameter: dir', 400);
    return;
  }

  if (!(await directoryExists(dir))) {
    apiFailure(res, `Directory not found: ${dir}`, 404);
    return;
  }

  const manifest = await readManifest(dir);
  apiSuccess(res, manifest);
});

// POST /api/manifest?dir=
router.post('/', async (req, res) => {
  const dir = req.query['dir'];
  if (typeof dir !== 'string' || dir.trim() === '') {
    apiFailure(res, 'Missing required query parameter: dir', 400);
    return;
  }

  const body: unknown = req.body;
  if (
    body === null ||
    typeof body !== 'object' ||
    !('excluded' in body) ||
    !isStringArray((body as Record<string, unknown>)['excluded'])
  ) {
    apiFailure(res, 'Invalid body: excluded must be an array of strings', 400);
    return;
  }

  const data = body as Record<string, unknown>;
  const manifest: ManifestData = {
    excluded: data['excluded'] as string[],
    lastViewed: typeof data['lastViewed'] === 'string' ? data['lastViewed'] : null,
    groupBoundaries: isStringArray(data['groupBoundaries']) ? data['groupBoundaries'] : [],
  };

  await writeManifest(dir, manifest);
  apiSuccess(res, { success: true });
});

// POST /api/manifest/regenerate?dir=
router.post('/regenerate', async (req, res) => {
  const dir = req.query['dir'];
  if (typeof dir !== 'string' || dir.trim() === '') {
    apiFailure(res, 'Missing required query parameter: dir', 400);
    return;
  }

  if (!(await directoryExists(dir))) {
    apiFailure(res, `Directory not found: ${dir}`, 404);
    return;
  }

  const entries = await readdir(dir);
  const imageFiles = new Set<string>(entries.filter(hasImageExtension));

  const existing = await readManifest(dir);
  const reconciled: ManifestData = {
    excluded: existing.excluded.filter((f: string) => imageFiles.has(f)),
    lastViewed:
      existing.lastViewed !== null && imageFiles.has(existing.lastViewed)
        ? existing.lastViewed
        : null,
    groupBoundaries: (existing.groupBoundaries ?? []).filter((f: string) => imageFiles.has(f)),
  };

  await writeManifest(dir, reconciled);
  apiSuccess(res, { success: true, manifest: reconciled });
});

export default router;
