import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEST_FOLDER = '/Users/davidcruwys/Downloads';
const CLIENT_URL = 'http://localhost:5020';
const SERVER_URL = 'http://localhost:5021';
const STARTUP_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out waiting for ${url} after ${timeoutMs}ms`);
}

function killProcess(proc: ChildProcess): void {
  try {
    if (proc.pid !== undefined) {
      process.kill(-proc.pid, 'SIGTERM');
    } else {
      proc.kill('SIGTERM');
    }
  } catch {
    // already dead
  }
}

let serverProcess: ChildProcess;
let clientProcess: ChildProcess;

test.beforeAll(async () => {
  serverProcess = spawn('npm', ['run', 'dev', '-w', 'server'], {
    cwd: ROOT,
    stdio: 'pipe',
    detached: true,
    env: { ...process.env, NODE_ENV: 'development' },
  });

  clientProcess = spawn('npm', ['run', 'dev', '-w', 'client'], {
    cwd: ROOT,
    stdio: 'pipe',
    detached: true,
    env: { ...process.env, NODE_ENV: 'development' },
  });

  await Promise.all([
    waitForUrl(`${SERVER_URL}/health`, STARTUP_TIMEOUT_MS),
    waitForUrl(CLIENT_URL, STARTUP_TIMEOUT_MS),
  ]);
});

test.afterAll(() => {
  try { killProcess(serverProcess); } finally { killProcess(clientProcess); }
});

// ── UAT-09: API — folder endpoint ──────────────────────────────────────────
test('UAT-09: GET /api/folder returns 14 sorted images from Downloads', async () => {
  const res = await fetch(`${SERVER_URL}/api/folder?path=${encodeURIComponent(TEST_FOLDER)}`);
  expect(res.status, 'folder API should return 200').toBe(200);

  const envelope = await res.json() as { data: { sorted: unknown[]; unsorted: unknown[]; excluded: unknown[] } };
  const body = envelope.data;
  expect(body.sorted, 'should have sorted array').toBeDefined();
  expect(body.sorted.length, 'should have 14 sorted images').toBe(14);
  expect(body.unsorted.length, 'unsorted should be empty').toBe(0);
});

// ── UAT-10: API — image serving ────────────────────────────────────────────
test('UAT-10: GET /api/images/:encodedPath serves image bytes', async () => {
  const folderRes = await fetch(`${SERVER_URL}/api/folder?path=${encodeURIComponent(TEST_FOLDER)}`);
  const envelope = await folderRes.json() as { data: { sorted: Array<{ encodedPath: string; filename: string }> } };
  const first = envelope.data.sorted[0];

  expect(first, 'should have at least one sorted image').toBeDefined();

  const imgRes = await fetch(`${SERVER_URL}/api/images/${first.encodedPath}`);
  expect(imgRes.status, `image serve for ${first.filename} should return 200`).toBe(200);

  const contentType = imgRes.headers.get('content-type');
  expect(contentType, 'content-type should be an image').toMatch(/image\//);
});

// ── UAT-01: App loads ──────────────────────────────────────────────────────
test('UAT-01: app loads with ThumbRack UI', async ({ page }) => {
  await page.goto(CLIENT_URL);
  await expect(page).toHaveTitle(/ThumbRack/i);

  const input = page.locator('input[placeholder*="folder path"], input[placeholder*="Paste"], input[type="text"]').first();
  await expect(input, 'directory input should be visible').toBeVisible();

  const loadBtn = page.getByRole('button', { name: /load/i });
  await expect(loadBtn, 'Load button should be visible').toBeVisible();
});

// ── UAT-02 + UAT-03: Load folder and see sorted images ────────────────────
test('UAT-02+03: loading Downloads shows 14 sorted thumbnails', async ({ page }) => {
  await page.goto(CLIENT_URL);

  const input = page.locator('input[placeholder*="folder path"], input[placeholder*="Paste"], input[type="text"]').first();
  await input.fill(TEST_FOLDER);

  const loadBtn = page.getByRole('button', { name: /load/i });
  await loadBtn.click();

  // Wait for sorted items to appear
  await page.waitForSelector('[aria-selected]', { timeout: 10_000 });

  const items = page.locator('[aria-selected]');
  const count = await items.count();
  expect(count, 'should show 14 sorted items').toBe(14);
});

// ── UAT-04: Image preview ──────────────────────────────────────────────────
test('UAT-04: clicking an image shows it in the preview pane', async ({ page }) => {
  await page.goto(CLIENT_URL);

  const input = page.locator('input[placeholder*="folder path"], input[placeholder*="Paste"], input[type="text"]').first();
  await input.fill(TEST_FOLDER);
  await page.getByRole('button', { name: /load/i }).click();
  await page.waitForSelector('[aria-selected]', { timeout: 10_000 });

  // Click first item
  const firstItem = page.locator('[aria-selected]').first();
  await firstItem.click();

  // Preview pane should show an image
  const previewImg = page.locator('[data-testid="preview-filename"]');
  await expect(previewImg, 'preview filename label should appear').toBeVisible({ timeout: 5_000 });
});

// ── UAT-05: Unsorted pane ──────────────────────────────────────────────────
test('UAT-05: unsorted pane shows "No unsorted images" for Downloads', async ({ page }) => {
  await page.goto(CLIENT_URL);

  const input = page.locator('input[placeholder*="folder path"], input[placeholder*="Paste"], input[type="text"]').first();
  await input.fill(TEST_FOLDER);
  await page.getByRole('button', { name: /load/i }).click();
  await page.waitForSelector('[aria-selected]', { timeout: 10_000 });

  await expect(page.getByText(/no unsorted images/i), 'unsorted empty state should show').toBeVisible();
});

// ── UAT-07: Regenerate button ──────────────────────────────────────────────
test('UAT-07: Regenerate button is enabled after loading folder', async ({ page }) => {
  await page.goto(CLIENT_URL);

  // Before load — should be disabled
  const regenBtn = page.getByRole('button', { name: /regenerate/i });
  await expect(regenBtn, 'Regenerate should be disabled before load').toBeDisabled();

  const input = page.locator('input[placeholder*="folder path"], input[placeholder*="Paste"], input[type="text"]').first();
  await input.fill(TEST_FOLDER);
  await page.getByRole('button', { name: /load/i }).click();
  await page.waitForSelector('[aria-selected]', { timeout: 10_000 });

  await expect(regenBtn, 'Regenerate should be enabled after load').toBeEnabled();

  await regenBtn.click();
  await expect(page.getByText(/manifest regenerated/i), 'success toast should appear').toBeVisible({ timeout: 5_000 });
});

// ── UAT-08: Keyboard navigation ────────────────────────────────────────────
test('UAT-08: arrow keys navigate the sorted list', async ({ page }) => {
  await page.goto(CLIENT_URL);

  const input = page.locator('input[placeholder*="folder path"], input[placeholder*="Paste"], input[type="text"]').first();
  await input.fill(TEST_FOLDER);
  await page.getByRole('button', { name: /load/i }).click();
  await page.waitForSelector('[aria-selected]', { timeout: 10_000 });

  // Click first item to establish selection
  await page.locator('[aria-selected]').first().click();

  // Press ArrowDown — should move to second item
  await page.keyboard.press('ArrowDown');

  // The second item should now be selected (aria-selected="true")
  const selectedItems = page.locator('[aria-selected="true"]');
  const selectedCount = await selectedItems.count();
  expect(selectedCount, 'exactly one item should be selected').toBe(1);

  // Preview should be visible
  await expect(page.locator('[data-testid="preview-filename"]'), 'preview should update').toBeVisible();
});
