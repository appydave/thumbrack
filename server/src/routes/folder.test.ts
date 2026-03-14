import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock node:fs before importing the router
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    promises: {
      access: vi.fn(),
      readdir: vi.fn(),
      readFile: vi.fn(),
    },
  };
});

// Mock node:fs/promises (used by manifestHelpers.ts)
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import { promises as fs } from 'node:fs';
import * as fsp from 'node:fs/promises';
import folderRouter from './folder.js';

// fs.readdir without options returns Promise<string[]>; cast the mock accordingly
const mockAccess = vi.mocked(fs.access);
const mockReaddir = fs.readdir as unknown as ReturnType<typeof vi.fn>;
const mockReadFile = vi.mocked(fsp.readFile);

const app = express();
app.use('/api/folder', folderRouter);

beforeEach(() => {
  vi.resetAllMocks();
});

function mockDir(files: string[]): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockReaddir.mockResolvedValueOnce(files as any);
}

function enoent(): NodeJS.ErrnoException {
  const err = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  return err;
}

describe('GET /api/folder', () => {
  it('returns 400 when path query param is missing', async () => {
    const res = await request(app).get('/api/folder');
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/path/i);
  });

  it('returns 400 when path query param is empty string', async () => {
    const res = await request(app).get('/api/folder?path=');
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 404 when directory does not exist', async () => {
    mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

    const res = await request(app).get('/api/folder?path=/nonexistent/dir');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });

  it('correctly separates sorted, unsorted, and excluded images', async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    mockReadFile.mockRejectedValueOnce(enoent());
    mockDir(['01-title.png', '02-intro.jpg', 'screenshot.png', 'random.jpeg']);

    const res = await request(app).get('/api/folder?path=/test/dir');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');

    const { sorted, unsorted, excluded } = res.body.data;
    expect(sorted).toHaveLength(2);
    expect(unsorted).toHaveLength(2);
    expect(excluded).toHaveLength(0);

    expect(sorted[0].filename).toBe('01-title.png');
    expect(sorted[0].number).toBe(1);
    expect(sorted[0].label).toBe('title.png');

    expect(sorted[1].filename).toBe('02-intro.jpg');
    expect(sorted[1].number).toBe(2);

    const unsortedFilenames = unsorted.map((i: { filename: string }) => i.filename);
    expect(unsortedFilenames).toContain('screenshot.png');
    expect(unsortedFilenames).toContain('random.jpeg');
  });

  it('puts excluded filenames from manifest into excluded list', async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({ excluded: ['screenshot.png'], lastViewed: null })
    );
    mockDir(['01-title.png', 'screenshot.png']);

    const res = await request(app).get('/api/folder?path=/test/dir');
    expect(res.status).toBe(200);

    const { sorted, unsorted, excluded } = res.body.data;
    expect(sorted).toHaveLength(1);
    expect(unsorted).toHaveLength(0);
    expect(excluded).toHaveLength(1);
    expect(excluded[0].filename).toBe('screenshot.png');
  });

  it('sorted list is in ascending numeric order', async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    mockReadFile.mockRejectedValueOnce(enoent());
    mockDir(['03-third.png', '01-first.png', '02-second.png']);

    const res = await request(app).get('/api/folder?path=/test/dir');
    expect(res.status).toBe(200);

    const { sorted } = res.body.data;
    expect(sorted).toHaveLength(3);
    expect(sorted[0].number).toBe(1);
    expect(sorted[1].number).toBe(2);
    expect(sorted[2].number).toBe(3);
  });

  it('skips __tmp_ prefixed files', async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    mockReadFile.mockRejectedValueOnce(enoent());
    mockDir(['__tmp_upload.png', '01-real.png']);

    const res = await request(app).get('/api/folder?path=/test/dir');
    expect(res.status).toBe(200);

    const { sorted, unsorted } = res.body.data;
    expect(sorted).toHaveLength(1);
    expect(unsorted).toHaveLength(0);
    expect(sorted[0].filename).toBe('01-real.png');
  });

  it('skips .thumbrack.json manifest file', async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    mockReadFile.mockRejectedValueOnce(enoent());
    mockDir(['.thumbrack.json', '01-real.png']);

    const res = await request(app).get('/api/folder?path=/test/dir');
    expect(res.status).toBe(200);

    const { sorted, unsorted } = res.body.data;
    expect(sorted).toHaveLength(1);
    expect(unsorted).toHaveLength(0);
  });

  it('skips non-image files', async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    mockReadFile.mockRejectedValueOnce(enoent());
    mockDir(['readme.txt', '01-image.png', 'video.mp4']);

    const res = await request(app).get('/api/folder?path=/test/dir');
    expect(res.status).toBe(200);

    const { sorted, unsorted } = res.body.data;
    expect(sorted).toHaveLength(1);
    expect(unsorted).toHaveLength(0);
  });

  it('treats single-digit prefixed files as unsorted (e.g. 3-thing.png)', async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    mockReadFile.mockRejectedValueOnce(enoent());
    mockDir(['3-thing.png', '01-sorted.png']);

    const res = await request(app).get('/api/folder?path=/test/dir');
    expect(res.status).toBe(200);

    const { sorted, unsorted } = res.body.data;
    expect(sorted).toHaveLength(1);
    expect(unsorted).toHaveLength(1);
    expect(unsorted[0].filename).toBe('3-thing.png');
  });

  it('encodedPath can be decoded back to the absolute path', async () => {
    mockAccess.mockResolvedValueOnce(undefined);
    mockReadFile.mockRejectedValueOnce(enoent());
    mockDir(['01-title.png']);

    const res = await request(app).get('/api/folder?path=/test/dir');
    expect(res.status).toBe(200);

    const image = res.body.data.sorted[0];
    const decoded = Buffer.from(image.encodedPath as string, 'base64url').toString('utf8');
    expect(decoded).toBe('/test/dir/01-title.png');
  });
});
