import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock node:fs/promises before importing the router
vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  rename: vi.fn().mockResolvedValue(undefined),
}));

// Also mock the renameHelpers so twoPassRename uses our mocked fs
vi.mock('../helpers/renameHelpers.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../helpers/renameHelpers.js')>();
  return {
    ...actual,
    twoPassRename: vi.fn().mockResolvedValue([{ from: '05-foo.png', to: '01-foo.png' }]),
  };
});

import renameRouter from './rename.js';

const app = express();
app.use(express.json());
app.use(renameRouter);

describe('POST /api/rename', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when dir is missing', async () => {
    const res = await request(app)
      .post('/api/rename')
      .send({ filename: '05-foo.png', newNumber: 1 });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when filename is missing', async () => {
    const res = await request(app)
      .post('/api/rename')
      .send({ dir: '/some/dir', newNumber: 1 });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when newNumber is missing', async () => {
    const res = await request(app)
      .post('/api/rename')
      .send({ dir: '/some/dir', filename: '05-foo.png' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when newNumber is 0 (out of range)', async () => {
    const res = await request(app)
      .post('/api/rename')
      .send({ dir: '/some/dir', filename: '05-foo.png', newNumber: 0 });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when newNumber is 100 (out of range)', async () => {
    const res = await request(app)
      .post('/api/rename')
      .send({ dir: '/some/dir', filename: '05-foo.png', newNumber: 100 });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when newNumber is not an integer', async () => {
    const res = await request(app)
      .post('/api/rename')
      .send({ dir: '/some/dir', filename: '05-foo.png', newNumber: 1.5 });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 404 when file does not exist', async () => {
    const { access } = await import('node:fs/promises');
    vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'));

    const res = await request(app)
      .post('/api/rename')
      .send({ dir: '/some/dir', filename: '05-foo.png', newNumber: 3 });
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });

  it('returns success with empty renamedFiles when filename equals target (no-op)', async () => {
    const { access } = await import('node:fs/promises');
    vi.mocked(access).mockResolvedValueOnce(undefined); // file exists

    // 05-foo.png renamed to number 5 → still 05-foo.png
    const res = await request(app)
      .post('/api/rename')
      .send({ dir: '/some/dir', filename: '05-foo.png', newNumber: 5 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.renamedFiles).toHaveLength(0);
  });

  it('renames file correctly when target does not exist', async () => {
    const { access, rename } = await import('node:fs/promises');
    // First access call: source file exists
    vi.mocked(access).mockResolvedValueOnce(undefined);
    // Second access call: target file does NOT exist
    vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'));
    vi.mocked(rename).mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/api/rename')
      .send({ dir: '/some/dir', filename: '05-foo.png', newNumber: 1 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.renamedFiles).toEqual([{ from: '05-foo.png', to: '01-foo.png' }]);
  });
});

describe('POST /api/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when dir is missing', async () => {
    const res = await request(app)
      .post('/api/reorder')
      .send({ order: ['01-foo.png', '02-bar.png'] });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when order is missing', async () => {
    const res = await request(app).post('/api/reorder').send({ dir: '/some/dir' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when order is empty array', async () => {
    const res = await request(app).post('/api/reorder').send({ dir: '/some/dir', order: [] });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('returns 400 when order has more than 99 items', async () => {
    const order = Array.from({ length: 100 }, (_, i) => `${String(i + 1).padStart(2, '0')}-f.png`);
    const res = await request(app).post('/api/reorder').send({ dir: '/some/dir', order });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('calls twoPassRename and returns renamedFiles on success', async () => {
    const { twoPassRename } = await import('../helpers/renameHelpers.js');
    vi.mocked(twoPassRename).mockResolvedValueOnce([{ from: '05-foo.png', to: '01-foo.png' }]);

    const res = await request(app)
      .post('/api/reorder')
      .send({ dir: '/some/dir', order: ['05-foo.png', '02-bar.png'] });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.renamedFiles).toEqual([{ from: '05-foo.png', to: '01-foo.png' }]);
    expect(twoPassRename).toHaveBeenCalledWith('/some/dir', [
      { from: '05-foo.png', to: '01-foo.png' },
    ]);
  });

  it('skips files that already have the correct name', async () => {
    const { twoPassRename } = await import('../helpers/renameHelpers.js');
    vi.mocked(twoPassRename).mockResolvedValueOnce([]);

    // order[0] = '01-foo.png' → target '01-foo.png' (no rename needed)
    const res = await request(app)
      .post('/api/reorder')
      .send({ dir: '/some/dir', order: ['01-foo.png'] });

    expect(res.status).toBe(200);
    // twoPassRename called with empty operations since filename === targetFilename
    expect(twoPassRename).toHaveBeenCalledWith('/some/dir', []);
  });
});
