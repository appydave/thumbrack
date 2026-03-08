import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import imagesRouter from './images.js';

// Use a real temp directory with actual image files so res.sendFile works
const tmpDir = join(tmpdir(), `images-test-${Date.now()}`);
const testPng = join(tmpDir, 'test-image.png');
const testJpg = join(tmpDir, 'test-photo.jpg');
const testJpeg = join(tmpDir, 'test-photo.jpeg');
const testPNG = join(tmpDir, 'test-upper.PNG');

beforeAll(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  // Minimal valid 1x1 PNG bytes
  const pngBytes = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000' +
    '0090wc3000000000c4944415408d7636060600000000400013418' +
    'b00000000049454e44ae426082',
    'hex',
  );
  await fs.writeFile(testPng, pngBytes);
  await fs.writeFile(testJpg, pngBytes); // content doesn't matter for sendFile
  await fs.writeFile(testJpeg, pngBytes);
  await fs.writeFile(testPNG, pngBytes);
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeApp(): express.Express {
  const app = express();
  app.use('/api/images', imagesRouter);
  return app;
}

describe('GET /api/images/:encodedPath', () => {
  it('returns 400 for a non-image extension', async () => {
    const app = makeApp();
    const badPath = '/some/file.txt';
    const encodedPath = Buffer.from(badPath).toString('base64url');

    const res = await request(app).get(`/api/images/${encodedPath}`);
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/extension/i);
  });

  it('returns 400 for a path with no extension', async () => {
    const app = makeApp();
    const badPath = '/some/file-without-extension';
    const encodedPath = Buffer.from(badPath).toString('base64url');

    const res = await request(app).get(`/api/images/${encodedPath}`);
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('serves file for valid encoded .png path', async () => {
    const app = makeApp();
    const encodedPath = Buffer.from(testPng).toString('base64url');

    const res = await request(app).get(`/api/images/${encodedPath}`);
    expect(res.status).toBe(200);
  });

  it('serves file for valid encoded .jpg path', async () => {
    const app = makeApp();
    const encodedPath = Buffer.from(testJpg).toString('base64url');

    const res = await request(app).get(`/api/images/${encodedPath}`);
    expect(res.status).toBe(200);
  });

  it('serves file for valid encoded .jpeg path', async () => {
    const app = makeApp();
    const encodedPath = Buffer.from(testJpeg).toString('base64url');

    const res = await request(app).get(`/api/images/${encodedPath}`);
    expect(res.status).toBe(200);
  });

  it('serves file for .PNG (uppercase extension treated as .png)', async () => {
    const app = makeApp();
    const encodedPath = Buffer.from(testPNG).toString('base64url');

    const res = await request(app).get(`/api/images/${encodedPath}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 when the encoded path points to a non-existent file', async () => {
    const app = makeApp();
    const missingPath = join(tmpDir, 'missing.png');
    const encodedPath = Buffer.from(missingPath).toString('base64url');

    const res = await request(app).get(`/api/images/${encodedPath}`);
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });
});
