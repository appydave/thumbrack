import { Router } from 'express';
import { promises as fs } from 'node:fs';
import { join, extname } from 'node:path';
import type { FolderImage, FolderResponse } from '@appystack/shared';
import { apiSuccess, apiFailure } from '../helpers/response.js';
import { readManifest } from '../helpers/manifestHelpers.js';

const router = Router();

const SORTED_PATTERN = /^(\d{2})-(.+)$/;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const MANIFEST_FILENAME = '.thumbrack.json';

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filename).toLowerCase());
}

function buildFolderImage(filename: string, dir: string): FolderImage {
  const absolutePath = join(dir, filename);
  const encodedPath = Buffer.from(absolutePath).toString('base64url');
  const match = SORTED_PATTERN.exec(filename);

  if (match) {
    return {
      filename,
      path: absolutePath,
      number: parseInt(match[1], 10),
      label: match[2],
      encodedPath,
    };
  }

  return {
    filename,
    path: absolutePath,
    number: null,
    label: filename,
    encodedPath,
  };
}

router.get('/', async (req, res) => {
  const dir = req.query['path'];

  if (typeof dir !== 'string' || dir.trim() === '') {
    apiFailure(res, 'Missing required query parameter: path', 400);
    return;
  }

  try {
    await fs.access(dir);
  } catch {
    apiFailure(res, `Directory not found: ${dir}`, 404);
    return;
  }

  const manifest = await readManifest(dir);
  const excludedSet = new Set(manifest.excluded);

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    apiFailure(res, `Failed to read directory: ${dir}`, 500);
    return;
  }

  const sorted: FolderImage[] = [];
  const unsorted: FolderImage[] = [];
  const excluded: FolderImage[] = [];

  for (const filename of entries) {
    if (filename.startsWith('__tmp_')) continue;
    if (filename === MANIFEST_FILENAME) continue;
    if (!isImageFile(filename)) continue;

    const image = buildFolderImage(filename, dir);

    if (excludedSet.has(filename)) {
      excluded.push(image);
    } else if (image.number !== null) {
      sorted.push(image);
    } else {
      unsorted.push(image);
    }
  }

  sorted.sort((a, b) => {
    const diff = (a.number ?? 0) - (b.number ?? 0);
    if (diff !== 0) return diff;
    return a.filename.localeCompare(b.filename);
  });

  const response: FolderResponse = {
    dir,
    sorted,
    unsorted,
    excluded,
  };

  apiSuccess(res, response);
});

export default router;
