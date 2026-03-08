import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractLabel, buildFilename, twoPassRename } from './renameHelpers.js';

// We'll mock node:fs/promises for twoPassRename tests
vi.mock('node:fs/promises', () => ({
  rename: vi.fn().mockResolvedValue(undefined),
}));

describe('extractLabel', () => {
  it('strips a two-digit prefix from a filename', () => {
    expect(extractLabel('05-some-image.png')).toBe('some-image.png');
  });

  it('strips prefix 01- correctly', () => {
    expect(extractLabel('01-ecamm-title.png')).toBe('ecamm-title.png');
  });

  it('strips prefix 99- correctly', () => {
    expect(extractLabel('99-last-file.jpg')).toBe('last-file.jpg');
  });

  it('returns filename unchanged if no NN- prefix', () => {
    expect(extractLabel('no-prefix.png')).toBe('no-prefix.png');
  });

  it('returns filename unchanged if prefix has more than two digits', () => {
    expect(extractLabel('123-file.png')).toBe('123-file.png');
  });

  it('returns filename unchanged if prefix has only one digit', () => {
    expect(extractLabel('5-file.png')).toBe('5-file.png');
  });
});

describe('buildFilename', () => {
  it('pads single-digit numbers to two digits', () => {
    expect(buildFilename(1, 'foo.png')).toBe('01-foo.png');
  });

  it('does not double-pad two-digit numbers', () => {
    expect(buildFilename(10, 'bar.png')).toBe('10-bar.png');
  });

  it('handles number 99', () => {
    expect(buildFilename(99, 'last.jpg')).toBe('99-last.jpg');
  });

  it('joins number and label with a hyphen', () => {
    expect(buildFilename(5, 'ecamm-title.png')).toBe('05-ecamm-title.png');
  });
});

describe('twoPassRename', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls rename with temp names in pass 1 then final names in pass 2', async () => {
    const { rename } = await import('node:fs/promises');
    const mockRename = vi.mocked(rename);

    const operations = [
      { from: '05-foo.png', to: '01-foo.png' },
      { from: '03-bar.png', to: '02-bar.png' },
    ];

    const result = await twoPassRename('/some/dir', operations);

    // 4 total rename calls: 2 (pass 1) + 2 (pass 2)
    expect(mockRename).toHaveBeenCalledTimes(4);

    // Pass 1: originals → temps
    expect(mockRename).toHaveBeenNthCalledWith(
      1,
      '/some/dir/05-foo.png',
      '/some/dir/__tmp_0__05-foo.png'
    );
    expect(mockRename).toHaveBeenNthCalledWith(
      2,
      '/some/dir/03-bar.png',
      '/some/dir/__tmp_1__03-bar.png'
    );

    // Pass 2: temps → final targets
    expect(mockRename).toHaveBeenNthCalledWith(
      3,
      '/some/dir/__tmp_0__05-foo.png',
      '/some/dir/01-foo.png'
    );
    expect(mockRename).toHaveBeenNthCalledWith(
      4,
      '/some/dir/__tmp_1__03-bar.png',
      '/some/dir/02-bar.png'
    );

    // Returns correct logical renames
    expect(result).toEqual([
      { from: '05-foo.png', to: '01-foo.png' },
      { from: '03-bar.png', to: '02-bar.png' },
    ]);
  });

  it('returns an empty array when no operations are provided', async () => {
    const result = await twoPassRename('/some/dir', []);
    expect(result).toEqual([]);
  });

  it('produces correct rename sequence for a single operation', async () => {
    const { rename } = await import('node:fs/promises');
    const mockRename = vi.mocked(rename);

    const operations = [{ from: '03-img.png', to: '01-img.png' }];
    await twoPassRename('/dir', operations);

    expect(mockRename).toHaveBeenCalledTimes(2);
    expect(mockRename).toHaveBeenNthCalledWith(1, '/dir/03-img.png', '/dir/__tmp_0__03-img.png');
    expect(mockRename).toHaveBeenNthCalledWith(2, '/dir/__tmp_0__03-img.png', '/dir/01-img.png');
  });
});
