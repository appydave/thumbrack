import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import manifestRouter from './manifest.js';

let tmpDir: string;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/manifest', manifestRouter);
  return app;
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'thumbrack-manifest-route-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ──────────────────────────────────────────────
// GET /api/manifest
// ──────────────────────────────────────────────

describe('GET /api/manifest', () => {
  it('returns 400 when dir param is missing', async () => {
    const res = await request(buildApp()).get('/api/manifest');
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 404 when dir does not exist', async () => {
    const res = await request(buildApp()).get('/api/manifest?dir=/nonexistent/path/xyz');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });

  it('returns empty manifest when .thumbrack.json does not exist', async () => {
    const res = await request(buildApp()).get(`/api/manifest?dir=${encodeURIComponent(tmpDir)}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data).toEqual({ excluded: [], lastViewed: null, groupBoundaries: [] });
  });

  it('returns manifest when .thumbrack.json exists', async () => {
    const manifest = { excluded: ['a.png', 'b.jpg'], lastViewed: 'c.jpeg' };
    await writeFile(join(tmpDir, '.thumbrack.json'), JSON.stringify(manifest), 'utf-8');
    const res = await request(buildApp()).get(`/api/manifest?dir=${encodeURIComponent(tmpDir)}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ...manifest, groupBoundaries: [] });
  });

  it('returns empty manifest when .thumbrack.json has malformed JSON', async () => {
    await writeFile(join(tmpDir, '.thumbrack.json'), '{ broken json }', 'utf-8');
    const res = await request(buildApp()).get(`/api/manifest?dir=${encodeURIComponent(tmpDir)}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ excluded: [], lastViewed: null, groupBoundaries: [] });
  });
});

// ──────────────────────────────────────────────
// POST /api/manifest
// ──────────────────────────────────────────────

describe('POST /api/manifest', () => {
  it('returns 400 when dir param is missing', async () => {
    const res = await request(buildApp())
      .post('/api/manifest')
      .send({ excluded: [], lastViewed: null });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when body is missing excluded array', async () => {
    const res = await request(buildApp())
      .post(`/api/manifest?dir=${encodeURIComponent(tmpDir)}`)
      .send({ lastViewed: null });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when excluded is not an array', async () => {
    const res = await request(buildApp())
      .post(`/api/manifest?dir=${encodeURIComponent(tmpDir)}`)
      .send({ excluded: 'not-an-array', lastViewed: null });
    expect(res.status).toBe(400);
  });

  it('writes manifest to disk and returns success', async () => {
    const manifest = { excluded: ['old.png'], lastViewed: 'new.jpg' };
    const res = await request(buildApp())
      .post(`/api/manifest?dir=${encodeURIComponent(tmpDir)}`)
      .send(manifest);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ success: true });

    // Verify it was actually written
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(join(tmpDir, '.thumbrack.json'), 'utf-8');
    expect(JSON.parse(raw)).toEqual(manifest);
  });
});

// ──────────────────────────────────────────────
// POST /api/manifest/regenerate
// ──────────────────────────────────────────────

describe('POST /api/manifest/regenerate', () => {
  it('returns 400 when dir param is missing', async () => {
    const res = await request(buildApp()).post('/api/manifest/regenerate');
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 404 when dir does not exist', async () => {
    const res = await request(buildApp()).post('/api/manifest/regenerate?dir=/nonexistent/xyz');
    expect(res.status).toBe(404);
  });

  it('removes stale excluded entries that no longer exist in folder', async () => {
    // Create one real image file
    await writeFile(join(tmpDir, 'exists.png'), '', 'utf-8');
    // Manifest references a file that no longer exists
    const staleManifest = { excluded: ['exists.png', 'gone.jpg'], lastViewed: null };
    await writeFile(join(tmpDir, '.thumbrack.json'), JSON.stringify(staleManifest), 'utf-8');

    const res = await request(buildApp()).post(
      `/api/manifest/regenerate?dir=${encodeURIComponent(tmpDir)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.manifest.excluded).toEqual(['exists.png']);
  });

  it('clears lastViewed when the file no longer exists', async () => {
    await writeFile(join(tmpDir, 'present.png'), '', 'utf-8');
    const staleManifest = { excluded: [], lastViewed: 'missing.jpg' };
    await writeFile(join(tmpDir, '.thumbrack.json'), JSON.stringify(staleManifest), 'utf-8');

    const res = await request(buildApp()).post(
      `/api/manifest/regenerate?dir=${encodeURIComponent(tmpDir)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.manifest.lastViewed).toBeNull();
  });

  it('keeps lastViewed when the file still exists', async () => {
    await writeFile(join(tmpDir, 'keeper.png'), '', 'utf-8');
    const manifest = { excluded: [], lastViewed: 'keeper.png' };
    await writeFile(join(tmpDir, '.thumbrack.json'), JSON.stringify(manifest), 'utf-8');

    const res = await request(buildApp()).post(
      `/api/manifest/regenerate?dir=${encodeURIComponent(tmpDir)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.manifest.lastViewed).toBe('keeper.png');
  });

  it('returns empty manifest when no .thumbrack.json exists', async () => {
    const res = await request(buildApp()).post(
      `/api/manifest/regenerate?dir=${encodeURIComponent(tmpDir)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.manifest.excluded).toEqual([]);
    expect(res.body.data.manifest.lastViewed).toBeNull();
  });

  it('only considers image files (.png, .jpg, .jpeg) when reconciling', async () => {
    await writeFile(join(tmpDir, 'image.png'), '', 'utf-8');
    await writeFile(join(tmpDir, 'document.txt'), '', 'utf-8');
    const manifest = { excluded: ['document.txt', 'image.png'], lastViewed: null };
    await writeFile(join(tmpDir, '.thumbrack.json'), JSON.stringify(manifest), 'utf-8');

    const res = await request(buildApp()).post(
      `/api/manifest/regenerate?dir=${encodeURIComponent(tmpDir)}`
    );
    expect(res.status).toBe(200);
    // document.txt is not an image so even though it exists, it should be pruned
    expect(res.body.data.manifest.excluded).toEqual(['image.png']);
  });
});
