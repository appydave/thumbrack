# AGENTS.md — ThumbRack Wave 4

## Project Overview

**Project**: ThumbRack
**Campaign**: thumbrack-wave4
**What it is**: A local desktop image sequencer. Point it at a folder, see all images, drag thumbnails to reorder them. Reordering renames files immediately using a two-digit prefix convention (01-name.png, 02-name.png, ...). Files without a prefix go into an "unsorted" bucket and can be dragged into the sequence.

**Wave 4 focus**: Drag UX fixes + divider/boundary feature. Three drag bugs fixed first (opacity, deselect on reorder, handle-only drag). Then a new divider system: visual horizontal separators between images in the sorted pane, stored as filename anchors in .thumbrack.json, surviving reorders via filename translation in the reorder endpoint.

**Stack**:

- Client: React 19 + Vite + TypeScript + Tailwind CSS 4 + dnd-kit + Vitest + Testing Library
- Server: Express 5 + TypeScript + Vitest + Supertest
- Shared: TypeScript types — **ManifestData changes this wave**
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
│       ├── App.tsx
│       ├── components/
│       │   ├── ContextMenu.tsx            # ← add divider menu items here
│       │   ├── GroupDivider.tsx           # ← CREATE THIS (wave 4, WU-5)
│       │   ├── KebabMenu.tsx
│       │   └── ToastContainer.tsx
│       ├── contexts/
│       │   ├── FolderContext.tsx          # ← fix reload clearing selected (WU-2)
│       │   └── ToastContext.tsx
│       ├── hooks/
│       │   ├── useDragDrop.ts
│       │   ├── useManualEntry.ts
│       │   ├── useExclusion.ts
│       │   ├── useKeyboardNav.ts
│       │   ├── useRecentFolders.ts
│       │   └── useDividers.ts             # ← CREATE THIS (wave 4, WU-5) — add/remove boundary
│       ├── pages/
│       │   └── ThumbRackApp.tsx
│       ├── styles/
│       │   └── index.css                  # ← add .drag-source and .group-divider styles
│       └── utils/
│           └── api.ts
├── server/
│   └── src/
│       ├── routes/
│       │   └── rename.ts                  # ← update reorder to translate groupBoundaries (WU-4)
│       └── helpers/
│           └── manifestHelpers.ts         # ← update readManifest/writeManifest for groupBoundaries (WU-4)
├── shared/
│   └── src/
│       └── types.ts                       # ← add groupBoundaries to ManifestData (WU-4)
└── docs/planning/thumbrack-wave4/         # this campaign
```

---

## Success Criteria

Before marking any work unit complete:

- [ ] TypeScript compiles with no errors (`npm run typecheck` from repo root)
- [ ] All new code has at least one test
- [ ] Tests pass (`npm run test` — client + server)
- [ ] No TypeScript `any` types introduced
- [ ] No unused imports, functions, or variables
- [ ] Feature works end-to-end in the browser (not just unit tested)

---

## Core Domain — Image Naming Convention

Files are considered **sorted** if their name matches: `/^\d{2}-/` (two digits, then a hyphen).

Range: 01–99 only. Do not generate numbers outside this range.

---

## Divider Data Model — Read This First

### ManifestData (after wave 4)

```typescript
// shared/src/types.ts
export interface ManifestData {
  excluded: string[];
  lastViewed: string | null;
  groupBoundaries?: string[]; // ← NEW: filenames that have a divider rendered BEFORE them
}
```

### What groupBoundaries means

- `groupBoundaries: ["04-intro.png", "09-demo-start.png"]`
- Render a divider BEFORE `04-intro.png` and BEFORE `09-demo-start.png`
- Everything from position 0 to 2 is in "section 1", position 3 onwards (until next divider) is "section 2", etc.
- Dividers are anonymous — no names, no group IDs

### Why filename-anchor (not position-index)

Storing filenames instead of array positions means:

- Dividers survive image reorders as long as the reorder endpoint translates the filenames
- Adding/removing images from outside the app doesn't shift all divider indices
- The "fence follows its anchor image" behaviour: if you drag the anchor image, the divider visually moves with it

### The reorder endpoint must update groupBoundaries atomically

When `POST /api/reorder` renames files:

1. It receives `{ dir, order: string[] }` — the desired new ordering of filenames
2. It computes a rename map: `{ oldFilename: newFilename }` for every file
3. After renaming files, it must ALSO read the manifest, translate each filename in `groupBoundaries` using the rename map, and write the updated manifest

```typescript
// Pseudocode for rename.ts reorder handler
const renameMap = computeRenameMap(currentOrder, desiredOrder);
await renameFiles(dir, renameMap);
const manifest = await readManifest(dir);
if (manifest.groupBoundaries?.length) {
  manifest.groupBoundaries = manifest.groupBoundaries
    .map((filename) => renameMap[filename] ?? filename) // translate old→new; keep if not renamed
    .filter((filename) => filename); // remove any that no longer exist
  await writeManifest(dir, manifest);
}
```

---

## Wave 4 Work Unit Details

### WU-1: fix-drag-opacity

**Goal**: The dragged item's source slot fades to opacity 0.35, which is nearly invisible over the dark `#0d0b08` background. Increase to 0.6 and add a CSS class for styling flexibility.

**Location**: `client/src/components/SortedPane.tsx` lines ~59–69 (the `SortableItem` style block)

**Current code**:

```typescript
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.35 : 1,
};
```

**Fix**:

```typescript
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.6 : 1,
};
```

Also add the CSS class:

```typescript
const itemClass = [
  'img-item',
  isDragging ? 'drag-source' : '',
  isSelected ? 'selected' : '',
  // ... other classes
]
  .filter(Boolean)
  .join(' ');
```

In `index.css`:

```css
.img-item.drag-source {
  border-style: dashed;
  border-color: var(--amber-dim);
}
```

**Test**: Update/add a test asserting that when `isDragging` is true, `opacity` is 0.6 (not 0.35) and the `drag-source` class is applied.

---

### WU-2: fix-drag-deselects

**Goal**: After every drag-and-drop reorder, the preview pane goes blank because `reload()` → `loadFolder()` → `setSelected(null)`. Fix: preserve the selected image across reloads.

**Location**: `client/src/contexts/FolderContext.tsx`

**Current problem**:

```typescript
// loadFolder() always does:
setSelected(null); // ← this clears the preview on every reload
```

**Fix approach**:

```typescript
// In FolderContext, change reload() to preserve selected:
const reload = useCallback(async () => {
  const previousFilename = selected?.filename ?? null;
  await loadFolder(dir!);
  // After loadFolder updates sorted[], restore selected if the file still exists
  if (previousFilename) {
    setSorted((prev) => {
      const restored = prev.find((img) => img.filename === previousFilename);
      if (restored) setSelected(restored);
      return prev;
    });
  }
}, [dir, selected, loadFolder]);
```

Alternative: pass a `preserveSelected` flag to `loadFolder`. Either approach is acceptable — choose the one that fits the existing code structure better after reading FolderContext.tsx.

**Test**: Add a test to `FolderContext.test.tsx` — after calling a mock reload (simulating a reorder), the selected image should remain selected (not reset to null).

---

### WU-3: fix-full-card-drag

**Goal**: Make the entire image card draggable, not just the 20px ⠿ handle icon.

**Location**: `client/src/components/SortedPane.tsx` lines ~96–113 (the `<li>` / drag handle section)

**Current code**:

```tsx
<li ref={setNodeRef} style={style} {...attributes} className={itemClass} onClick={onSelect}>
  <div
    {...listeners}        {/* ← drag events only here */}
    className="drag-handle"
    onClick={(e) => e.stopPropagation()}
  >
    ⠿
  </div>
  ...
</li>
```

**Fix**: Move `{...listeners}` from the handle `<div>` to the `<li>`:

```tsx
<li
  ref={setNodeRef}
  style={style}
  {...attributes}
  {...listeners}
  className={itemClass}
  onClick={onSelect}
>
  <div className="drag-handle">⠿</div> {/* decorative only */}
  ...
</li>
```

**Why this works**: `@dnd-kit` distinguishes between a drag and a click using pointer movement distance. A short tap fires `onClick` (select). A pointer-down + move fires the drag. No conflict.

**Remove**: The `onClick={(e) => e.stopPropagation()}` on the handle div (no longer needed since listeners are on `<li>`).

**Update tests**: Any test that previously interacted with the drag handle specifically should be updated to interact with the `<li>` element.

---

### WU-4: schema-dividers

**Goal**: Add `groupBoundaries` to the shared types and update the reorder endpoint to translate filenames atomically.

**Changes required** (3 files):

**1. shared/src/types.ts**:

```typescript
export interface ManifestData {
  excluded: string[];
  lastViewed: string | null;
  groupBoundaries?: string[];
}
```

**2. server/src/helpers/manifestHelpers.ts**:

- `readManifest`: parse `groupBoundaries` as a string array (default to `[]` if absent)
- `writeManifest`: include `groupBoundaries` in the written JSON

**3. server/src/routes/rename.ts** (POST /api/reorder handler):
After renaming all files, read the manifest and translate `groupBoundaries`:

```typescript
// After the rename operations complete:
const manifest = await readManifest(dir);
if (manifest.groupBoundaries && manifest.groupBoundaries.length > 0) {
  const translated = manifest.groupBoundaries
    .map((name) => renameMap.get(name) ?? name)
    .filter((name) => existsAfterRename(name)); // exclude stale anchors
  manifest.groupBoundaries = translated;
  await writeManifest(dir, manifest);
}
```

**Tests to add**:

- `manifestHelpers.test.ts`: readManifest returns `groupBoundaries: []` when field absent; returns the array when present; writeManifest writes the field
- `rename.test.ts`: reorder with non-empty `groupBoundaries` — verify the manifest's groupBoundaries are updated to reflect new filenames after reorder

**Note**: The rename map is already computed during the reorder — it's the list of `{ from, to }` rename operations. The translation is a simple `.map()` over that existing data.

---

### WU-5: render-dividers (depends on WU-4)

**Goal**: Render visual dividers between sorted images. Allow adding/removing them via right-click context menu.

**New file: client/src/components/GroupDivider.tsx**:

```tsx
interface GroupDividerProps {
  onRemove: () => void;
}

export function GroupDivider({ onRemove }: GroupDividerProps) {
  return (
    <div className="group-divider">
      <div className="group-divider__line" />
      <button
        className="group-divider__remove"
        onClick={onRemove}
        title="Remove divider"
        aria-label="Remove divider"
      >
        ×
      </button>
    </div>
  );
}
```

In `index.css`:

```css
.group-divider {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
}
.group-divider__line {
  flex: 1;
  height: 1px;
  background: var(--amber-dim);
}
.group-divider__remove {
  font-size: 10px;
  color: var(--amber-dim);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.6;
}
.group-divider__remove:hover {
  opacity: 1;
  color: var(--amber);
}
```

**New hook: client/src/hooks/useDividers.ts**:

```typescript
// Reads groupBoundaries from manifest, provides addDivider(filename) and removeDivider(filename)
// Follows same pattern as useExclusion (fetchManifest → mutate → saveManifest → reload)
export function useDividers() {
  const { dir, reload } = useFolderContext();
  const { addToast } = useToast();

  const addDivider = async (filename: string) => {
    try {
      const manifest = await fetchManifest(dir!);
      manifest.groupBoundaries = [...(manifest.groupBoundaries ?? []), filename];
      await saveManifest(dir!, manifest);
      await reload();
    } catch {
      addToast('Failed to add divider', 'error');
    }
  };

  const removeDivider = async (filename: string) => {
    try {
      const manifest = await fetchManifest(dir!);
      manifest.groupBoundaries = (manifest.groupBoundaries ?? []).filter((f) => f !== filename);
      await saveManifest(dir!, manifest);
      await reload();
    } catch {
      addToast('Failed to remove divider', 'error');
    }
  };

  return { addDivider, removeDivider };
}
```

**SortedPane.tsx rendering change**:

```tsx
// In the sorted.map() — inject GroupDivider before items that are boundary anchors
{sorted.map((image) => (
  <React.Fragment key={image.filename}>
    {groupBoundaries.includes(image.filename) && (
      <GroupDivider onRemove={() => void removeDivider(image.filename)} />
    )}
    <SortableItem ... />
  </React.Fragment>
))}
```

**Note**: `groupBoundaries` comes from FolderContext (it must be loaded with the manifest data and exposed via context). The `sortedIds` array passed to `SortableContext` must NOT include any divider IDs — only image filenames.

**FolderContext update**: Add `groupBoundaries: string[]` to FolderContext state, populated from the manifest when `loadFolder` runs.

**ContextMenu additions**:

- If the right-clicked image is NOT in groupBoundaries: show "Add divider before this"
- If the right-clicked image IS in groupBoundaries: show "Remove divider"
- Wire to `addDivider(filename)` / `removeDivider(filename)`

**Tests**:

- `GroupDivider.test.tsx`: renders, calls onRemove when × is clicked, aria-label present
- `useDividers.test.ts`: addDivider adds filename to manifest; removeDivider removes it; error path shows toast
- `SortedPane.test.tsx`: GroupDivider renders between items when groupBoundaries contains the second item's filename; no GroupDivider renders when groupBoundaries is empty

---

## Reference Patterns

### dnd-kit SortableContext with non-sortable siblings

```tsx
// sortedIds must only contain the IDs of draggable items
// GroupDivider components are outside the sortedIds list
const sortedIds = sorted.map(img => img.filename); // no dividers here

<SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
  <ul>
    {sorted.map((image) => (
      <React.Fragment key={image.filename}>
        {groupBoundaries.includes(image.filename) && <GroupDivider ... />}
        <SortableItem key={image.filename} ... />
      </React.Fragment>
    ))}
  </ul>
</SortableContext>
```

### useExclusion pattern (model useDividers on this)

```typescript
// useExclusion.ts is the reference implementation for manifest-mutating hooks:
// 1. fetchManifest(dir)
// 2. mutate the manifest object
// 3. saveManifest(dir, manifest)
// 4. reload()
// 5. catch errors → addToast
```

### CSS variables (existing — use these)

```css
/* Available in index.css already */
var(--amber)         /* primary amber */
var(--amber-dim)     /* muted amber for subtle elements */
var(--amber-glow)    /* hover/selected amber background */
```

### localStorage pattern (consistent key management)

```typescript
const STORAGE_KEYS = {
  sidebarSize: 'thumbrack:sidebarSize',
  recentFolders: 'thumbrack:recentFolders',
  previewZoom: 'thumbrack:previewZoom',
} as const;
// thumbrack: prefix for all new keys
```

---

## Anti-Patterns to Avoid

- **Do not use Socket.io** — ThumbRack is pure REST
- **Do not install new libraries** — implement what's needed directly
- **Do not name dividers** — they are anonymous separators; a name implies group semantics
- **Do not store groupBoundaries as position indices** — always store filenames (the anchor approach)
- **Do not include GroupDivider in sortedIds** — only draggable items belong in the dnd-kit sortedIds array
- **Do not forget to translate groupBoundaries on reorder** — stale filename anchors cause dividers to disappear silently after any drag
- **Do not put UI preferences (zoom, sidebar size) in FolderContext** — groupBoundaries is folder data, so it DOES belong in FolderContext
- **Do not use `any` type**

---

## Quality Gates

- TypeScript: zero errors on `npm run typecheck`
- Tests: all pass on `npm run test` (client + server)
- No `any` types
- GroupDivider renders without being draggable
- After a reorder, dividers appear at the correct visual positions (translated correctly)
- Adding/removing a divider persists after page reload (written to .thumbrack.json)
- Dragging an image across a divider does not move the divider (the divider stays anchored to its filename)
- All context menu items tested

---

## Test Count Baseline

- **Wave 3 target handoff**: Server > 149, Client ≈ 262+ passing, 0 pre-existing failures
- **Wave 4 target**: Server and client counts increase. No regressions from wave 3.

---

## Learnings (Inherited from Wave 1 + Wave 2 + Wave 3)

### From Wave 1

- **dnd-kit listeners placement**: `{...listeners}` on the `<li>` vs dedicated handle — wave 4 intentionally REMOVES the handle restriction. This is a deliberate reversal of the wave 1 decision; document it in the wave 4 assessment.
- **Image serving via encodedPath**: `Buffer.from(absolutePath).toString('base64url')` on server; keep encoding symmetric.
- **Rename collision resolution**: Two-pass temp-rename strategy for reorders. `useManualEntry` has client-side collision check.
- **Test fake timers**: ToastContext uses `setTimeout`. Tests need `vi.useFakeTimers()` + `vi.runAllTimers()`.

### From Wave 2

- **localStorage namespace**: `thumbrack:` prefix. Wrap reads in try/catch.
- **data-\* attribute as CSS hook**: Clean pattern for visual state without prop drilling.
- **KebabMenu close pattern**: Close on outside mousedown + Escape + item selection.
- **ThumbRackApp parallel file conflicts**: Wave 2 had 3 agents touch the same file — caused dead code. Wave 4 assigns one agent per file section.

### From Wave 3 (to be filled in after wave 3 completes)

- Pre-existing test fix patterns
- Utility extraction outcomes
- Any new patterns discovered
