# AGENTS.md — ThumbRack Wave 2

## Project Overview

**Project**: ThumbRack
**Campaign**: thumbrack-wave2
**What it is**: A local desktop image sequencer. Point it at a folder, see all images, drag thumbnails to reorder them. Reordering renames files immediately using a two-digit prefix convention (01-name.png, 02-name.png, ...). Files without a prefix go into an "unsorted" bucket and can be dragged into the sequence.

**Wave 2 focus**: UAT polish — sidebar size presets, default folder + recent paths, UI polish (regenerate tooltip/menu), preview zoom modes. All work units are **client-only** — no server changes required.

**Stack**:
- Client: React 19 + Vite + TypeScript + Tailwind CSS 4 + dnd-kit + Vitest + Testing Library
- Server: Express 5 + TypeScript + Vitest + Supertest (no changes this wave)
- Shared: TypeScript types (no changes this wave)
- No Socket.io usage — pure REST for ThumbRack

**Ports**: Client `http://localhost:5020` | Server `http://localhost:5021`

---

## Build & Run Commands

```bash
# From repo root (/thumbrack)
npm run dev                  # runs client + server concurrently
npm run build                # full build (shared → server → client)
npm run test                 # runs all tests
npm run typecheck            # TypeScript check across all workspaces

# Client only (from /thumbrack/client)
npm run dev                  # Vite dev server on :5020
npm run test                 # Vitest
npm run test:coverage        # coverage report

# Server only (from /thumbrack/server)
npm run test                 # Vitest (no server changes this wave)
```

---

## Directory Structure

```
thumbrack/
├── client/
│   └── src/
│       ├── App.tsx                    # root component — header, sidebar, preview layout
│       ├── components/
│       │   ├── ToastContainer.tsx     # toast notification overlay
│       │   ├── ContextMenu.tsx        # right-click context menu
│       │   └── Header.tsx             # (may need to create/extract) — holds path input + kebab menu
│       ├── contexts/
│       │   └── FolderContext.tsx      # global folder state (dir, sorted, unsorted, excluded)
│       ├── hooks/
│       │   ├── useFolder.ts           # folder loading, reload
│       │   ├── useDragDrop.ts         # dnd-kit drag/drop
│       │   ├── useManifest.ts         # manifest read/write
│       │   ├── useManualEntry.ts      # badge number editing
│       │   ├── useExclusion.ts        # exclude/restore images
│       │   └── useKeyboardNav.ts      # arrow key + F2 navigation
│       ├── pages/
│       │   └── ThumbRackApp.tsx       # main app layout
│       ├── styles/
│       │   └── index.css              # global CSS, CSS variables (--sidebar-width)
│       └── utils/
│           └── imageUrl.ts            # path encoding helpers
├── server/
│   └── src/
│       ├── routes/                    # NO CHANGES THIS WAVE
│       └── helpers/                   # NO CHANGES THIS WAVE
└── docs/planning/thumbrack-wave2/    # this campaign
```

---

## Success Criteria

Before marking any work unit complete:

- [ ] TypeScript compiles with no errors (`npm run typecheck` from repo root)
- [ ] All new code has at least one test (unit or integration)
- [ ] Tests pass (`npm run test` from repo root — client + server)
- [ ] No TypeScript `any` types introduced
- [ ] Feature works end-to-end in the browser (not just unit tested in isolation)
- [ ] No hardcoded paths or ports — use env config

---

## Core Domain — Image Naming Convention

Files are considered **sorted** if their name matches: `/^\d{2}-/` (two digits, then a hyphen).

Examples:
- `01-ecamm-title-slide.png` → sorted, position 1
- `14-ecamm-invitation.png` → sorted, position 14
- `screenshot.png` → unsorted (no prefix)
- `3-something.png` → unsorted (one digit, not two)

Sort order for the sorted list: **numeric prefix first, then alphabetical** for ties. Range: 01–99 only.

---

## Wave 2 Work Unit Details

### WU-1: client-sidebar-size

**Goal**: Replace the fixed sidebar width with S/M/L size presets.

**Sizes**:
- S (small): `180px` — filmstrip thumbnails, text hidden or truncated to ~3 chars
- M (medium): `288px` — current layout (was the default in wave 1)
- L (large): `420px` — full filenames readable (default for wave 2)

**Implementation approach**:
- Add a `sidebarSize: 'S' | 'M' | 'L'` state (local to ThumbRackApp or a small SidebarContext — **not** FolderContext, which is about folder data)
- Store choice in `localStorage` key `thumbrack:sidebarSize` — persist across reloads
- Add S / M / L toggle buttons to the sidebar header (above the sorted pane)
- CSS: update `--sidebar-width` CSS variable dynamically, or apply a Tailwind class (`w-[180px]`, `w-[288px]`, `w-[420px]`)
- Default: `L`

**Test coverage**:
- Size toggle changes the rendered width (check class or style)
- Default is `L` on first load (no localStorage value)
- Persists to localStorage on change
- Loads from localStorage on mount

---

### WU-2: client-default-folder

**Goal**: Pre-fill the directory path input with `~/Downloads` on first load. Show a recent-folders dropdown.

**Implementation approach**:
- In `useFolder` or a new `useRecentFolders` hook:
  - On mount, if `dir` is null/empty, set the path input value to `~/Downloads`
  - After a successful `loadFolder(path)`, prepend the path to a `thumbrack:recentFolders` localStorage array (max 5, deduplicated, most-recent first)
- Add a small dropdown arrow button next to the path input
- When clicked, show a list of the recent folders (or "No recent folders" if empty)
- Clicking a recent folder populates the input and calls `loadFolder`
- The dropdown closes on outside click or Escape

**Test coverage**:
- Default value is `~/Downloads` when no folder loaded
- loadFolder persists to recentFolders in localStorage
- Deduplication: loading the same path twice doesn't create a duplicate entry
- Max 5 entries: loading a 6th path pushes out the oldest
- Clicking a recent folder entry triggers loadFolder

**Note**: `~/Downloads` is a client-side string — the server already handles `~` expansion via Node's `os.homedir()`. If the server does NOT expand `~`, add expansion in the server's path-validation route. Check `server/src/routes/folder.ts` first.

---

### WU-3: client-ui-polish

**Goal**: Clarify the Regenerate button. Move it out of the header into a kebab/options menu.

**Implementation approach**:
- Create a `<KebabMenu>` component (or `<OptionsMenu>`) in `client/src/components/`
  - A `⋮` button that toggles a dropdown
  - Menu items as a children or items prop
  - Closes on outside click or Escape
- Replace the standalone Regenerate button in the header with `<KebabMenu>` containing a "Regenerate Manifest" item
- The "Regenerate Manifest" item should have a `title` or descriptive label: "Rebuild .thumbrack.json from scratch — use if manifest gets out of sync with the folder"
- Wire the menu item to the same `regenerate()` handler the button used

**Test coverage**:
- KebabMenu opens on button click
- KebabMenu closes on Escape key
- KebabMenu closes on outside click
- "Regenerate Manifest" item calls the regenerate handler
- Accessible: button has `aria-label="Options"`

---

### WU-4: client-preview-zoom

**Goal**: Add Fit / Fill / Actual size toggle buttons to the preview pane.

**Zoom modes**:
- **Fit** (default): `object-fit: contain` — whole image visible, letterboxed
- **Fill**: `object-fit: cover` — image fills the preview area, crops edges
- **Actual**: `width: auto; height: auto; max-width: none; max-height: none; overflow: auto` — natural image size, scrollable container

**Implementation approach**:
- Add `zoomMode: 'fit' | 'fill' | 'actual'` local state to `PreviewPane` (no need for context)
- Render three toggle buttons in the preview pane header/footer area: `Fit | Fill | Actual`
- Apply appropriate CSS class/style to the `<img>` based on mode
- Actual mode requires the preview container to become `overflow: auto` and the img to be `max-w-none max-h-none`
- Store preference in `localStorage` key `thumbrack:previewZoom` — persist across reloads

**Test coverage**:
- Default zoom is `fit`
- Clicking Fill changes mode to fill
- Clicking Actual changes mode to actual
- Clicking Fit returns to fit
- Mode persists to localStorage
- Loads from localStorage on mount

---

## Reference Patterns

### localStorage pattern (consistent key management)

```typescript
// Use a constants file or inline — keep keys consistent
const STORAGE_KEYS = {
  sidebarSize: 'thumbrack:sidebarSize',
  recentFolders: 'thumbrack:recentFolders',
  previewZoom: 'thumbrack:previewZoom',
} as const;

// Read with fallback
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Write
function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — ignore
  }
}
```

### Click-outside hook (for dropdown/menu close behaviour)

```typescript
// hooks/useClickOutside.ts
import { useEffect, RefObject } from 'react';

export function useClickOutside(ref: RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}
```

### Mocking localStorage in Vitest

```typescript
// In test setup or per-test
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Reset between tests
beforeEach(() => localStorageMock.clear());
```

### CSS variable sidebar width (existing pattern to extend)

```css
/* client/src/styles/index.css — check if --sidebar-width already exists */
:root {
  --sidebar-width: 420px; /* default to L */
}

/* Apply to sidebar element */
.sidebar {
  width: var(--sidebar-width);
}
```

Alternatively, use Tailwind dynamic classes if CSS variables aren't in use yet. Check `index.css` and `ThumbRackApp.tsx` for the current sidebar width implementation before choosing an approach.

### Existing shared types (do not duplicate)

```typescript
// shared/src/types/ — already defined in wave 1
// FolderImage, FolderResponse, ManifestData, RenameRequest, ReorderRequest
// Import from '@appystack/shared' — do not re-define
```

---

## Anti-Patterns to Avoid

- **Do not use Socket.io** — ThumbRack is pure REST. No socket event handlers.
- **Do not install a toast library** — ToastContext already exists, use it.
- **Do not install a dropdown/select library** — implement lightweight dropdowns directly (< 40 lines each).
- **Do not put sidebar size or zoom preference in FolderContext** — that context is for folder data. UI preferences are local state + localStorage.
- **Do not use the File System Access API** (`window.showDirectoryPicker()`) — server-side path input is the chosen approach.
- **Do not use `any` type** — use the shared types from `@appystack/shared` or define new types inline.
- **Do not generate numbers outside 01–99** — existing validation, don't touch.
- **Do not forget the Escape key** — all dropdowns and menus must close on Escape.

---

## Quality Gates

- TypeScript: zero errors on `npm run typecheck`
- Tests: all pass on `npm run test` (client + server — server tests must stay green even though no server changes)
- No `any` types
- All dropdowns/menus close on outside click AND Escape key
- localStorage keys use the `thumbrack:` prefix namespace (consistency)
- Preview zoom Actual mode must make the image scrollable — not clipped

---

## Learnings (Inherited from Wave 1 + Wave 2)

### From Wave 1
- **dnd-kit listeners on `<li>`**: Spreading `{...listeners}` on the entire list item intercepts pointer events before `onClick` fires. Always add a dedicated drag handle `<div>` and move `{...listeners}` to it.
- **Image serving via encodedPath**: `Buffer.from(absolutePath).toString('base64url')` on server; `btoa(path).replace(...)` on client. Keep encoding/decoding symmetric.
- **Rename collision resolution**: Two-pass temp-rename strategy for reorders. `useManualEntry` has client-side collision check for badge edits (number already taken → error toast).
- **Test fake timers**: ToastContext uses `setTimeout` for auto-dismiss. Tests must use `vi.useFakeTimers()` + `vi.runAllTimers()` to avoid flakiness.
- **Port mismatch risk**: `env.test.ts` had hardcoded wrong port (5501 instead of 5021). Always derive test port from `process.env.PORT` or match the actual config.
- **Wave 1 test counts**: Server = 149 tests, Client = 104 tests. New wave should only add to these numbers, never subtract.

### From Wave 2
- **localStorage namespace**: Use `thumbrack:` prefix for all localStorage keys (`thumbrack:sidebarSize`, `thumbrack:recentFolders`, `thumbrack:previewZoom`). Wrap all reads in try/catch — quota errors and JSON.parse failures should return the fallback, never throw.
- **data-* attribute as CSS hook**: `data-sidebar-size="S"` on `<aside>` + CSS selector `[data-sidebar-size="S"] .img-label { display: none }` is cleaner than passing props down the tree for pure visual concerns.
- **Pre-existing test failures**: Wave 1 left 33 failing client tests (SortedPane CSS class changes, ContextMenu, ExcludedPane, ToastContainer, useManualEntry TS arg mismatch). Wave 2 fixed 6 of these incidentally. Remaining 27 are pre-existing — they are NOT regressions introduced by wave 2.
- **useManualEntry 4-arg signature**: The hook requires `(dir, reload, sorted, onError)` — 4 args. Tests that called it with 2 args were silently broken. When testing hooks, check the actual hook signature before writing the test.
- **KebabMenu close pattern**: All dropdown/menu components must close on (a) outside mousedown, (b) Escape keydown, and (c) after item selection. Use two separate useEffect hooks — one for mousedown, one for keydown — for cleaner cleanup.
- **Dead code in ThumbRackApp**: Parallel agents added helper functions (`_handleRecentSelect`, `_handleDropdownKeyDown`) that were never called in JSX. TypeScript `noUnusedLocals` catches these. Remove before marking unit complete.
- **Wave 2 final counts**: Server = 149 tests, Client ≈ 262 passing (27 pre-existing failures).
