import { Router } from 'express';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { RenameRequest, ReorderRequest, RenameResponse } from '@appystack/shared';
import { apiSuccess, apiFailure } from '../helpers/response.js';
import { extractLabel, buildFilename, twoPassRename } from '../helpers/renameHelpers.js';
import { readManifest, writeManifest } from '../helpers/manifestHelpers.js';

const router = Router();

// POST /api/rename — rename a single file to a new number
router.post('/api/rename', async (req, res) => {
  const body = req.body as Partial<RenameRequest>;

  // Validate required fields
  if (!body.dir || !body.filename || body.newNumber === undefined) {
    apiFailure(res, 'Missing required fields: dir, filename, newNumber', 400);
    return;
  }

  const { dir, filename, newNumber } = body;

  // Validate newNumber is an integer in range 1–99
  if (!Number.isInteger(newNumber) || newNumber < 1 || newNumber > 99) {
    apiFailure(res, 'newNumber must be an integer between 1 and 99', 400);
    return;
  }

  // Validate the file exists
  const filePath = join(dir, filename);
  try {
    await access(filePath);
  } catch {
    apiFailure(res, `File not found: ${filename}`, 404);
    return;
  }

  // Build new filename
  const label = extractLabel(filename);
  const newFilename = buildFilename(newNumber, label);

  // No-op if same name
  if (newFilename === filename) {
    const response: RenameResponse = { success: true, renamedFiles: [] };
    apiSuccess(res, response);
    return;
  }

  // Check if target already exists — use two-step temp rename to handle collision
  const targetPath = join(dir, newFilename);
  let targetExists = false;
  try {
    await access(targetPath);
    targetExists = true;
  } catch {
    targetExists = false;
  }

  try {
    let renamedFiles: Array<{ from: string; to: string }>;

    if (targetExists) {
      // Two-step: temp the existing target, then rename source, then move temp to its slot
      // For a single rename we just use twoPassRename with the one operation —
      // the existing file at targetPath will be overwritten if we don't protect it.
      // Use a temp name for the existing occupant so we don't lose it.
      const { rename: fsRename } = await import('node:fs/promises');
      const tempName = `__tmp_0__${newFilename}`;
      await fsRename(targetPath, join(dir, tempName));
      await fsRename(filePath, targetPath);
      // The displaced file stays at tempName (caller is responsible for further reordering)
      // Per spec: "for a single rename: if target exists, just do temp→final in two steps"
      await fsRename(join(dir, tempName), join(dir, newFilename));
      renamedFiles = [{ from: filename, to: newFilename }];
    } else {
      const { rename: fsRename } = await import('node:fs/promises');
      await fsRename(filePath, targetPath);
      renamedFiles = [{ from: filename, to: newFilename }];
    }

    const response: RenameResponse = { success: true, renamedFiles };
    apiSuccess(res, response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Rename failed';
    apiFailure(res, message, 500);
  }
});

// POST /api/reorder — rename all files to match a new desired ordering
router.post('/api/reorder', async (req, res) => {
  const body = req.body as Partial<ReorderRequest>;

  // Validate required fields
  if (!body.dir || !body.order) {
    apiFailure(res, 'Missing required fields: dir, order', 400);
    return;
  }

  const { dir, order } = body;

  // Validate order length
  if (!Array.isArray(order) || order.length < 1 || order.length > 99) {
    apiFailure(res, 'order must be an array of 1–99 filenames', 400);
    return;
  }

  // Build operations: for each filename in order, compute target name based on position
  const operations: Array<{ from: string; to: string }> = [];
  for (let i = 0; i < order.length; i++) {
    const filename = order[i];
    const targetNumber = i + 1; // position 0 → number 01
    const label = extractLabel(filename);
    const targetFilename = buildFilename(targetNumber, label);

    if (filename !== targetFilename) {
      operations.push({ from: filename, to: targetFilename });
    }
  }

  try {
    const renamedFiles = await twoPassRename(dir, operations);

    // Build a rename map from the completed operations: old filename → new filename
    const renameMap = new Map<string, string>(operations.map(({ from, to }) => [from, to]));

    // Update groupBoundaries in the manifest to reflect the new filenames
    const manifest = await readManifest(dir);
    const currentBoundaries = manifest.groupBoundaries ?? [];

    // Determine the final set of filenames after reorder to filter out stale boundaries
    const finalFilenames = new Set<string>(
      order.map((filename, i) => {
        const targetNumber = i + 1;
        const label = extractLabel(filename);
        return buildFilename(targetNumber, label);
      })
    );

    // Translate each boundary to its new filename (if renamed), then filter out
    // any that are no longer present in the final file set
    const filteredBoundaries = currentBoundaries
      .map((filename) => renameMap.get(filename) ?? filename)
      .filter((filename) => finalFilenames.has(filename));

    await writeManifest(dir, { ...manifest, groupBoundaries: filteredBoundaries });

    const response: RenameResponse = { success: true, renamedFiles };
    apiSuccess(res, response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reorder failed';
    apiFailure(res, message, 500);
  }
});

export default router;
