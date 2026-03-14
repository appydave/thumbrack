# AGENTS.md — ThumbRack Wave 3

## Project Overview

**Project**: ThumbRack
**Campaign**: thumbrack-wave3
**What it is**: A local desktop image sequencer. Point it at a folder, see all images, drag thumbnails to reorder them. Reordering renames files immediately using a two-digit prefix convention (01-name.png, 02-name.png, ...). Files without a prefix go into an "unsorted" bucket and can be dragged into the sequence.

**Wave 3 focus**: Code quality + test hygiene — no new features. Fix 27 pre-existing test failures, extract duplicated utilities, delete dead scaffold, add error handling to silent failure paths, add tests for the highest-risk untested server code path.

**Stack**:

- Client: React 19 + Vite + TypeScript + Tailwind CSS 4 + dnd-kit + Vitest + Testing Library
- Server: Express 5 + TypeScript + Vitest + Supertest
- Shared: TypeScript types (no changes this wave)
- No Socket.io usage — pure REST for ThumbRack

**Ports**: Client `http://localhost:5020` | Server `http://localhost:5021`

---

## Build & Run Commands

```bash
# From repo root (/thumbrack)
npm run dev                  # runs client + server concurrently
npm run build                # full build (shared → server → client)
npm run test                 # runs all tests (client + server)
npm run typecheck            # TypeScript check across all workspaces

# Client only (from /thumbrack/client)
npm run test                 # Vitest
npm run test:coverage        # coverage report

# Server only (from /thumbrack/server)
npm run test                 # Vitest + Supertest
```

---

## Directory Structure

```
thumbrack/
├── client/
│   └── src/
│       ├── App.tsx                         # root component
│       ├── components/
│       │   ├── ToastContainer.tsx
│       │   ├── ContextMenu.tsx
│       │   ├── KebabMenu.tsx
│       │   └── Header.tsx
│       ├── contexts/
│       │   ├── FolderContext.tsx           # global folder state
│       │   ├── ToastContext.tsx            # toast notifications
│       │   └── AppContext.tsx              # ← DEAD SCAFFOLD — delete this
│       ├── hooks/
│       │   ├── useDragDrop.ts
│       │   ├── useManualEntry.ts
│       │   ├── useExclusion.ts            # ← add error handling here
│       │   ├── useKeyboardNav.ts
│       │   ├── useRecentFolders.ts
│       │   └── useClickOutside.ts
│       ├── lib/                           # ← CREATE THIS FOLDER
│       │   └── storage.ts                 # ← extract readStorage/writeStorage here
│       ├── pages/
│       │   └── ThumbRackApp.tsx           # remove local readStorage/writeStorage
│       ├── styles/
│       │   └── index.css
│       └── utils/
│           └── api.ts                     # imageUrl is exported here — use this
├── server/
│   └── src/
│       ├── routes/
│       │   ├── folder.ts                  # remove local readManifest — import from helpers
│       │   └── rename.ts                  # ← add collision path tests here
│       └── helpers/
│           └── manifestHelpers.ts         # canonical readManifest lives here
└── docs/planning/thumbrack-wave3/         # this campaign
```

---

## Success Criteria

Before marking any work unit complete:

- [ ] TypeScript compiles with no errors (`npm run typecheck` from repo root)
- [ ] All new tests pass (`npm run test` — client + server)
- [ ] Pre-existing test failures in files YOU touched: zero (run tests before and after; you must not introduce new failures)
- [ ] No TypeScript `any` types introduced
- [ ] No unused imports, functions, or variables (`noUnusedLocals` is enforced)
- [ ] If you deleted a file, confirm no remaining imports of that file anywhere in the codebase

---

## Core Domain — Image Naming Convention

Files are considered **sorted** if their name matches: `/^\d{2}-/` (two digits, then a hyphen).

Examples:

- `01-ecamm-title-slide.png` → sorted, position 1
- `14-ecamm-invitation.png` → sorted, position 14
- `screenshot.png` → unsorted (no prefix)
- `3-something.png` → unsorted (one digit, not two)

---

## Wave 3 Work Unit Details

### WU-1: fix-test-assertions

**Goal**: Eliminate the 27 pre-existing client test failures.

**Background**: Wave 1 changed CSS classes from Tailwind utilities to semantic CSS classes (`.selected`, `.excluded-item` etc. in `index.css`). The test files were never updated to match. Tests assert class names like `bg-blue-100`, `border-blue-500`, `opacity-50` that no longer exist in the DOM.

**Steps**:

1. Run `npm run test` from `/thumbrack/client` — note which tests fail and why
2. For each failing test, read the actual implementation file to find what CSS class IS applied
3. Rewrite the assertion to check the real class name. Examples:
   - `expect(el.className).toContain('bg-blue-100')` → `expect(el.className).toContain('selected')`
   - `expect(el.className).toContain('opacity-50')` → `expect(el.className).toContain('excluded-item')`
   - OR: use `aria-selected` if it's already set — `expect(el).toHaveAttribute('aria-selected', 'true')`
4. Do NOT change the implementation files — only fix the tests

**Files likely involved**: `SortedPane.test.tsx`, `UnsortedPane.test.tsx`, `ExcludedPane.test.tsx`, `ContextMenu.test.tsx`, `ToastContainer.test.tsx`

**Do NOT touch**: `AppContext.test.tsx` — that file is handled by the delete-dead-scaffold work unit.

**Done when**: `npm run test` (client) shows 0 pre-existing failures in the files you touched.

---

### WU-2: extract-client-utilities

**Goal**: Remove three instances of copy-paste drift in the client.

**Task 1 — readStorage/writeStorage**:

- Create `client/src/lib/storage.ts` with the canonical implementation:

```typescript
const STORAGE_KEYS = {
  sidebarSize: 'thumbrack:sidebarSize',
  recentFolders: 'thumbrack:recentFolders',
  previewZoom: 'thumbrack:previewZoom',
} as const;

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — ignore
  }
}
```

- Remove the local `readStorage`/`writeStorage` from `ThumbRackApp.tsx` and `PreviewPane.tsx`
- Import from `../lib/storage` in both files

**Task 2 — imageUrl**:

- `PreviewPane.tsx` has a local `imageUrl` function and a local `BASE` constant — remove them
- Import `imageUrl` from `../utils/api` (it's already exported there)

**Task 3 — readManifest (server)**:

- `server/src/routes/folder.ts` has a local `readManifest` implementation
- Remove it and import `readManifest` from `../helpers/manifestHelpers`
- Note: the folder.ts version uses `Partial<ManifestData>` cast — the manifestHelpers version may be stricter. Align types as needed, but do not weaken the canonical manifestHelpers version.

**Done when**: No duplicate utility implementations. TypeScript clean. All tests pass.

---

### WU-3: delete-dead-scaffold

**Goal**: Delete AppContext.tsx and AppContext.test.tsx — the counter scaffold that was never wired into the app.

**Steps**:

1. Confirm `AppContext.tsx` is not imported anywhere: search for `AppContext` in all `.tsx`/`.ts` files
2. Confirm `AppProvider` is not used in `App.tsx` or anywhere in the component tree
3. Delete both files
4. Run typecheck — no errors expected
5. Run tests — test count will decrease (that's expected, not a regression)

**Done when**: Both files deleted, no remaining imports, TypeScript clean, tests pass.

---

### WU-4: useExclusion-error-handling

**Goal**: Add try/catch to `exclude()` and `unexclude()` in `useExclusion.ts`. Show a toast on failure instead of silently swallowing the error.

**Current problem**: Both functions call `fetchManifest` and `saveManifest` without any error handling. Callers use `void exclude(...)` which discards the promise. Network errors are lost silently.

**Implementation**:

```typescript
// useExclusion.ts — wrap each async function body
const exclude = async (filename: string) => {
  try {
    const manifest = await fetchManifest(dir!);
    manifest.excluded = [...(manifest.excluded ?? []), filename];
    await saveManifest(dir!, manifest);
    await reload();
  } catch (err) {
    addToast(`Failed to exclude image: ${filename}`, 'error');
  }
};
```

- `addToast` comes from `useToast()` hook (already used in other hooks — check existing patterns)
- Same pattern for `unexclude()`

**Test coverage to add** (in `useExclusion.test.ts`):

- Mock `fetchManifest` to throw — assert `addToast` is called with an error message
- Mock `saveManifest` to throw — assert `addToast` is called
- Existing happy-path tests must still pass

**Done when**: Error paths show toast. New tests pass. Existing tests pass.

---

### WU-5: test-rename-collision

**Goal**: Add tests for the three-step temp-rename collision path in `server/src/routes/rename.ts`.

**Background**: When a reorder produces a target filename that already exists on disk, the route uses a three-step strategy:

1. Rename the conflicting file to a temp name (`__tmp_${filename}`)
2. Rename the source file to the target name
3. Rename the temp file to the source name

This is the most complex server code path and has zero test coverage. A bug here could silently lose or corrupt files.

**Test cases to write** (in `rename.test.ts` or a new `rename-collision.test.ts`):

1. **Happy path**: reorder where no filenames conflict — files renamed correctly
2. **Collision path**: reorder where the target filename already exists — three-step swap completes successfully, all files present with correct names after
3. **Verify atomicity**: after the swap, no `__tmp_` files remain on disk
4. **Multi-collision**: reorder that requires multiple swaps — all resolve correctly

**Setup**: Use real temp directories (`fs.mkdtemp` / `tmp` package, consistent with existing server tests). Do NOT mock the filesystem for these tests — they should operate on real files to catch actual rename failures.

**Done when**: All 4 test cases pass. No `__tmp_` files left behind. Server test count increases from 149.

---

## Reference Patterns

### Toast error pattern (existing — follow this)

```typescript
// In a hook that needs to show errors:
import { useToast } from '../contexts/ToastContext';

export function useExclusion() {
  const { addToast } = useToast();
  // ...
  try {
    // async work
  } catch {
    addToast('Something failed', 'error');
  }
}
```

### Checking what CSS class is actually applied

```typescript
// In tests — check the real class, not what you wish was there
// Step 1: render the component in a state that should apply the class
// Step 2: inspect the element
console.log(element.className); // shows the actual classes
// Step 3: use that class name in your assertion
expect(element.className).toContain('selected'); // not 'bg-blue-100'
```

### Server temp directory pattern (from existing tests)

```typescript
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'thumbrack-test-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
```

### Importing from manifestHelpers (server)

```typescript
// server/src/routes/folder.ts — replace local readManifest with:
import { readManifest } from '../helpers/manifestHelpers';
```

---

## Anti-Patterns to Avoid

- **Do not change implementation files to match broken tests** — fix the tests, not the code
- **Do not weaken the manifestHelpers.ts readManifest** to match the more permissive folder.ts version — align upward
- **Do not use `any` type** — TypeScript strict mode is on
- **Do not mock the filesystem in collision tests** — use real temp directories so the test catches actual rename errors
- **Do not introduce new test failures** — run the full test suite before and after your changes

---

## Quality Gates

- TypeScript: zero errors on `npm run typecheck`
- Tests: all pass on `npm run test` (client + server)
- Pre-existing failures in files touched: zero
- No `any` types
- No unused imports or variables
- No files with duplicate utility implementations

---

## Test Count Baseline

- **Wave 2 final**: Server = 149, Client ≈ 262 passing (27 pre-existing failures)
- **Wave 3 target**: Server > 149 (collision tests added), Client ≈ 262+ passing, 0 pre-existing failures
- If your work unit adds tests, the count should go UP. Never subtract tests without explicit justification.

---

## Learnings (Inherited from Wave 1 + Wave 2)

### From Wave 1

- **dnd-kit listeners on `<li>`**: Spreading `{...listeners}` on the entire list item intercepts pointer events before `onClick` fires. Always add a dedicated drag handle `<div>` and move `{...listeners}` to it.
- **Image serving via encodedPath**: `Buffer.from(absolutePath).toString('base64url')` on server; `btoa(path).replace(...)` on client. Keep encoding/decoding symmetric.
- **Rename collision resolution**: Two-pass temp-rename strategy for reorders. `useManualEntry` has client-side collision check for badge edits (number already taken → error toast).
- **Test fake timers**: ToastContext uses `setTimeout` for auto-dismiss. Tests must use `vi.useFakeTimers()` + `vi.runAllTimers()` to avoid flakiness.
- **Port mismatch risk**: `env.test.ts` had hardcoded wrong port. Always derive test port from `process.env.PORT` or match the actual config.

### From Wave 2

- **localStorage namespace**: Use `thumbrack:` prefix for all localStorage keys. Wrap all reads in try/catch — quota errors and JSON.parse failures should return the fallback, never throw.
- **data-\* attribute as CSS hook**: `data-sidebar-size="S"` on `<aside>` + CSS selector is cleaner than passing props down the tree for pure visual concerns.
- **Pre-existing test failures**: Wave 2 ended with 27 pre-existing failures (SortedPane CSS class changes, ContextMenu, ExcludedPane, ToastContainer). These are NOT regressions — they are the target of wave 3.
- **useManualEntry 4-arg signature**: The hook requires `(dir, reload, sorted, onError)` — 4 args. When testing hooks, check the actual hook signature before writing tests.
- **KebabMenu close pattern**: All dropdowns/menus must close on outside mousedown, Escape keydown, AND after item selection.
- **Dead code in ThumbRackApp**: Parallel agents added helper functions that were never called in JSX. TypeScript `noUnusedLocals` catches these. Remove before marking unit complete.
