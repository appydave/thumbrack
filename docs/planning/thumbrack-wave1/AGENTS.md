# AGENTS.md — ThumbRack Wave 1

## Project Overview

**Project**: ThumbRack
**Campaign**: thumbrack-wave1
**What it is**: A local desktop image sequencer. Point it at a folder, see all images, drag thumbnails to reorder them. Reordering renames files immediately using a two-digit prefix convention (01-name.png, 02-name.png, ...). Files without a prefix go into an "unsorted" bucket and can be dragged into the sequence.

**Stack**:
- Client: React 19 + Vite + TypeScript + Tailwind CSS 4 + dnd-kit + Vitest + Testing Library
- Server: Express 5 + TypeScript + Vitest + Supertest
- Shared: TypeScript types shared between client and server
- No Socket.io usage — pure REST for ThumbRack

**Ports**: Client `http://localhost:5020` | Server `http://localhost:5021`

---

## Build & Run Commands

```bash
# From repo root
npm run dev                  # runs client + server concurrently
npm run build                # full build (shared → server → client)
npm run test                 # runs all tests
npm run typecheck            # TypeScript check across all workspaces

# Client only (from /client)
npm run dev                  # Vite dev server on :5020
npm run test                 # Vitest
npm run test:coverage        # coverage report

# Server only (from /server)
npm run dev                  # nodemon, restarts on change
npm run test                 # Vitest
```

---

## Directory Structure

```
thumbrack/
├── client/
│   └── src/
│       ├── App.tsx                    # root component
│       ├── main.tsx                   # entry point
│       ├── components/                # shared UI components (toasts, context menu, etc.)
│       ├── contexts/                  # FolderContext — global folder state
│       ├── hooks/                     # useFolder, useDragDrop, useManifest
│       ├── pages/                     # LandingPage.tsx → replace with ThumbRackApp.tsx
│       ├── styles/                    # global CSS
│       └── utils/                    # path encoding helpers, image URL builders
├── server/
│   └── src/
│       ├── index.ts                   # app entry
│       ├── routes/                    # folder.ts, rename.ts, manifest.ts, images.ts
│       ├── helpers/                   # file renaming logic, manifest read/write
│       ├── middleware/                # existing error/rate-limit middleware
│       └── config/                   # env config
├── shared/
│   └── src/
│       └── types/                    # FolderImage, ManifestData, RenameRequest, etc.
└── docs/planning/thumbrack-wave1/    # this campaign
```

---

## Success Criteria

Before marking any work unit complete:

- [ ] TypeScript compiles with no errors (`npm run typecheck`)
- [ ] All new code has at least one test (unit or integration)
- [ ] Tests pass (`npm run test`)
- [ ] No console errors in browser during manual smoke test
- [ ] Feature works end-to-end (not just unit tested in isolation)
- [ ] No hardcoded paths or ports — use env config

---

## Core Domain — Image Naming Convention

Files are considered **sorted** if their name matches: `/^\d{2}-/` (two digits, then a hyphen).

Examples:
- `01-ecamm-title-slide.png` → sorted, position 1
- `14-ecamm-invitation.png` → sorted, position 14
- `screenshot.png` → unsorted (no prefix)
- `3-something.png` → unsorted (one digit, not two)

Sort order for the sorted list: **numeric prefix first, then alphabetical** for ties.

The 01–99 range is a hard scope limit. The app never generates a number outside this range.

---

## Reference Patterns

### Shared type definitions (add to shared/src/)

```typescript
// Image in a folder
export interface FolderImage {
  filename: string;       // full filename e.g. "01-ecamm-title.png"
  path: string;           // absolute path on disk
  number: number | null;  // parsed prefix number, or null if unsorted
  label: string;          // filename without the number prefix
  encodedPath: string;    // base64url-encoded absolute path for use in img src
}

// Folder listing response
export interface FolderResponse {
  dir: string;
  sorted: FolderImage[];    // sorted by number asc
  unsorted: FolderImage[];  // no number prefix
  excluded: FolderImage[];  // in manifest excluded list
}

// Manifest stored in .thumbrack.json
export interface ManifestData {
  excluded: string[];        // list of filenames (not paths) to exclude
  lastViewed: string | null; // filename of last selected image
}

// Rename request
export interface RenameRequest {
  dir: string;
  filename: string;
  newNumber: number;  // 1–99
}

// Reorder request (drag and drop)
export interface ReorderRequest {
  dir: string;
  order: string[];  // full list of sorted filenames in new order
}
```

### Server route pattern (Express 5)

```typescript
// server/src/routes/folder.ts
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { FolderResponse, FolderImage } from '@appystack/shared';

const router = Router();
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const SORTED_PATTERN = /^(\d{2})-(.+)$/;

router.get('/', async (req: Request, res: Response) => {
  const dir = req.query.path as string;
  if (!dir) return res.status(400).json({ error: 'path is required' });

  try {
    await fs.access(dir);
  } catch {
    return res.status(404).json({ error: 'Directory not found or not accessible' });
  }

  const files = await fs.readdir(dir);
  const imageFiles = files.filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));

  // ... parse, sort, return FolderResponse
  res.json(response);
});

export default router;
```

### Image serving route

```typescript
// server/src/routes/images.ts
// GET /api/images/:encodedPath
// encodedPath = Buffer.from(absolutePath).toString('base64url')
router.get('/:encodedPath', async (req, res) => {
  const absolutePath = Buffer.from(req.params.encodedPath, 'base64url').toString('utf8');
  // Security: verify the path is an image file (check extension), then serve
  res.sendFile(absolutePath);
});
```

### Client image src construction

```typescript
// utils/imageUrl.ts
export function imageUrl(absolutePath: string): string {
  const encoded = btoa(absolutePath).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `http://localhost:5021/api/images/${encoded}`;
}
```

### Rename conflict resolution (server helper)

```typescript
// When reordering, rename in two passes to avoid collisions:
// Pass 1: rename all affected files to __tmp_N__originalname
// Pass 2: rename all __tmp_N__ files to their final names
// This avoids the case where renaming 05→02 collides with existing 02
```

### dnd-kit sortable list (client pattern)

```typescript
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

// On drag end, call server reorder API with new order array
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const oldIndex = items.findIndex(i => i.filename === active.id);
  const newIndex = items.findIndex(i => i.filename === over.id);
  const newOrder = arrayMove(items, oldIndex, newIndex);
  // optimistic update UI, then call server
  reorder(newOrder.map(i => i.filename));
};
```

### Folder context (React context pattern)

```typescript
// contexts/FolderContext.tsx
interface FolderContextValue {
  dir: string | null;
  sorted: FolderImage[];
  unsorted: FolderImage[];
  excluded: FolderImage[];
  selected: FolderImage | null;
  loadFolder: (path: string) => Promise<void>;
  reload: () => Promise<void>;
  select: (image: FolderImage) => void;
}
```

### Toast notification pattern

```typescript
// Simple lightweight toast — do NOT install a heavy toast library
// Use a ToastContext with a queue of { id, message, type: 'success' | 'error' } items
// Auto-dismiss after 3000ms using useEffect + setTimeout
// Render in App.tsx as an overlay fixed to bottom-right
```

---

## Anti-Patterns to Avoid

- **Do not use Socket.io** — ThumbRack is pure REST. The socket setup in the scaffold is irrelevant; don't add socket event handlers.
- **Do not install a toast library** — implement a lightweight ToastContext directly. Heavy libs like react-toastify add unnecessary weight.
- **Do not use the File System Access API** (`window.showDirectoryPicker()`) — server-side path input is the chosen approach.
- **Do not sort by filename alphabetically** in the sorted list — sort by numeric prefix (parsed integer), then alpha for ties.
- **Do not rename files one-by-one without conflict resolution** — always use the two-pass temp-rename strategy for reorder operations.
- **Do not store display order in the manifest** — filenames are the source of truth. Manifest only stores `excluded` and `lastViewed`.
- **Do not include non-image files** in any list — filter strictly to `.png`, `.jpg`, `.jpeg`.
- **Do not generate numbers outside 01–99** — validate on server, reject with 400 if out of range.
- **Do not use `any` type** — use the shared types from `@appystack/shared`.

---

## Quality Gates

- TypeScript: zero errors on `npm run typecheck`
- Tests: all pass on `npm run test`
- Rename safety: reorder uses two-pass temp strategy — verified by unit test
- Image serving: path is validated (extension check) before serving — no path traversal
- Port config: client uses `VITE_API_URL` env var, server uses `PORT` env var — no hardcoded ports

---

## Learnings

_(Updated by coordinator as waves complete)_
