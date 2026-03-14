/**
 * rename-collision.test.ts
 *
 * Integration tests for the reorder endpoint's collision handling.
 * Uses real temp directories — no filesystem mocks — so actual rename
 * failures surface rather than being swallowed by stubs.
 *
 * These tests are kept separate from rename.test.ts because that file
 * mocks node:fs/promises and renameHelpers at module scope, which would
 * prevent testing the real two-pass collision logic.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mkdtemp, rm, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Import the real router — no mocks in this file
import renameRouter from './rename.js';

const app = express();
app.use(express.json());
app.use(renameRouter);

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'thumbrack-collision-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// Helper: create a file with dummy content in the temp dir
async function touch(filename: string): Promise<void> {
  await writeFile(join(dir, filename), `content:${filename}`);
}

// Helper: get all filenames in the temp dir, sorted
async function ls(): Promise<string[]> {
  const files = await readdir(dir);
  return files.sort();
}

describe('POST /api/reorder — collision path (real filesystem)', () => {
  it('no-collision reorder: 3 files renamed correctly with correct prefix numbers', async () => {
    // Setup: files already in order but with wrong numbers
    await touch('05-alpha.png');
    await touch('07-beta.png');
    await touch('09-gamma.png');

    const res = await request(app)
      .post('/api/reorder')
      .send({
        dir,
        order: ['05-alpha.png', '07-beta.png', '09-gamma.png'],
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.success).toBe(true);

    const files = await ls();
    expect(files).toEqual(['01-alpha.png', '02-beta.png', '03-gamma.png']);

    // Verify the renamedFiles list covers all three
    const renamed: Array<{ from: string; to: string }> = res.body.data.renamedFiles;
    const froms = renamed.map((r) => r.from).sort();
    const tos = renamed.map((r) => r.to).sort();
    expect(froms).toEqual(['05-alpha.png', '07-beta.png', '09-gamma.png']);
    expect(tos).toEqual(['01-alpha.png', '02-beta.png', '03-gamma.png'].sort());
  });

  it('single collision: desired target filename already exists — three-step temp swap completes', async () => {
    // 01-alpha.png already exists; we want to reorder so that 02-beta.png becomes 01-beta.png
    // and 01-alpha.png becomes 02-alpha.png → collision on 01-*.
    // Simpler case: file A wants to go to slot 1 but slot 1 is occupied by file B.
    await touch('01-beta.png'); // occupies slot 1
    await touch('05-alpha.png'); // wants to become 01-alpha.png (but slot 1 taken by different label)

    // Reorder: alpha first, beta second
    const res = await request(app)
      .post('/api/reorder')
      .send({
        dir,
        order: ['05-alpha.png', '01-beta.png'],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);

    const files = await ls();
    // Both files must be present with correct names — none lost
    expect(files).toContain('01-alpha.png');
    expect(files).toContain('02-beta.png');
    expect(files).toHaveLength(2);
  });

  it('no __tmp_ files left behind after a collision-involved reorder', async () => {
    await touch('01-second.png'); // slot 1 occupied
    await touch('02-first.png'); // wants slot 1

    // Swap: first → slot 1, second → slot 2
    const res = await request(app)
      .post('/api/reorder')
      .send({
        dir,
        order: ['02-first.png', '01-second.png'],
      });

    expect(res.status).toBe(200);

    const files = await ls();

    // No temp files should remain
    const tmpFiles = files.filter((f) => f.startsWith('__tmp_'));
    expect(tmpFiles).toHaveLength(0);

    // Both renamed correctly
    expect(files).toContain('01-first.png');
    expect(files).toContain('02-second.png');
  });

  it('multi-collision: swapping position 1 and position 2 resolves correctly', async () => {
    // Classic adjacent-swap scenario: both positions require renaming and each
    // target collides with the other's source name.
    await touch('01-apple.png');
    await touch('02-banana.png');
    await touch('03-cherry.png');

    // Reverse the first two: banana → slot 1, apple → slot 2, cherry stays
    const res = await request(app)
      .post('/api/reorder')
      .send({
        dir,
        order: ['02-banana.png', '01-apple.png', '03-cherry.png'],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);

    const files = await ls();

    // All three present with correct final names
    expect(files).toContain('01-banana.png');
    expect(files).toContain('02-apple.png');
    expect(files).toContain('03-cherry.png');
    expect(files).toHaveLength(3);

    // No orphaned temp files
    const tmpFiles = files.filter((f) => f.startsWith('__tmp_'));
    expect(tmpFiles).toHaveLength(0);
  });
});
