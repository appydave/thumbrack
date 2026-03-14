import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readManifest, writeManifest } from './manifestHelpers.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'thumbrack-manifest-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('readManifest', () => {
  it('returns empty manifest when file does not exist', async () => {
    const manifest = await readManifest(tmpDir);
    expect(manifest).toEqual({ excluded: [], lastViewed: null, groupBoundaries: [] });
  });

  it('returns manifest when file exists', async () => {
    const data = { excluded: ['a.png', 'b.jpg'], lastViewed: 'c.jpeg' };
    await writeFile(join(tmpDir, '.thumbrack.json'), JSON.stringify(data), 'utf-8');
    const manifest = await readManifest(tmpDir);
    expect(manifest).toEqual({ ...data, groupBoundaries: [] });
  });

  it('returns empty manifest when JSON is malformed', async () => {
    await writeFile(join(tmpDir, '.thumbrack.json'), '{ not valid json }', 'utf-8');
    const manifest = await readManifest(tmpDir);
    expect(manifest).toEqual({ excluded: [], lastViewed: null, groupBoundaries: [] });
  });

  it('returns empty manifest when JSON lacks excluded array', async () => {
    await writeFile(
      join(tmpDir, '.thumbrack.json'),
      JSON.stringify({ lastViewed: 'x.png' }),
      'utf-8'
    );
    const manifest = await readManifest(tmpDir);
    expect(manifest).toEqual({ excluded: [], lastViewed: null, groupBoundaries: [] });
  });

  it('coerces lastViewed to null when not a string', async () => {
    const data = { excluded: ['a.png'], lastViewed: 42 };
    await writeFile(join(tmpDir, '.thumbrack.json'), JSON.stringify(data), 'utf-8');
    const manifest = await readManifest(tmpDir);
    expect(manifest.lastViewed).toBeNull();
  });
});

describe('writeManifest', () => {
  it('writes pretty-printed JSON to .thumbrack.json', async () => {
    const data = { excluded: ['a.png'], lastViewed: 'b.jpg' };
    await writeManifest(tmpDir, data);
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(join(tmpDir, '.thumbrack.json'), 'utf-8');
    expect(raw).toBe(JSON.stringify(data, null, 2));
  });

  it('round-trips correctly through readManifest', async () => {
    const data = { excluded: ['x.png', 'y.jpg'], lastViewed: 'z.jpeg', groupBoundaries: ['a.png'] };
    await writeManifest(tmpDir, data);
    const result = await readManifest(tmpDir);
    expect(result).toEqual(data);
  });

  it('writes empty manifest correctly', async () => {
    await writeManifest(tmpDir, { excluded: [], lastViewed: null, groupBoundaries: [] });
    const result = await readManifest(tmpDir);
    expect(result).toEqual({ excluded: [], lastViewed: null, groupBoundaries: [] });
  });
});
