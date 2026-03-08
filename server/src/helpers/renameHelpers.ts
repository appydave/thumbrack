import { rename } from 'node:fs/promises';
import { join } from 'node:path';

/** Strip the NN- prefix from a filename, returning the label portion. */
export function extractLabel(filename: string): string {
  const match = filename.match(/^\d{2}-(.+)$/);
  return match ? match[1] : filename;
}

/** Build a filename from a number and a label, zero-padding the number to 2 digits. */
export function buildFilename(number: number, label: string): string {
  return String(number).padStart(2, '0') + '-' + label;
}

export interface RenameOperation {
  from: string;
  to: string;
}

/**
 * Performs a two-pass rename strategy to avoid filename collisions.
 *
 * Pass 1: rename each file that needs renaming to a safe temp name __tmp_{i}__<original>
 * Pass 2: rename each temp file to its final target name
 *
 * Returns the list of logical renames performed (from → to), excluding temp steps.
 */
export async function twoPassRename(
  dir: string,
  operations: RenameOperation[]
): Promise<RenameOperation[]> {
  const performed: RenameOperation[] = [];

  // Pass 1: rename originals to temp names
  const tempOps: Array<{ temp: string; target: string; original: string }> = [];
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const tempName = `__tmp_${i}__${op.from}`;
    await rename(join(dir, op.from), join(dir, tempName));
    tempOps.push({ temp: tempName, target: op.to, original: op.from });
  }

  // Pass 2: rename temp names to final targets
  for (const { temp, target, original } of tempOps) {
    await rename(join(dir, temp), join(dir, target));
    performed.push({ from: original, to: target });
  }

  return performed;
}
