---
generated: 2026-04-05
generator: system-context
status: snapshot
sources:
  - CLAUDE.md
  - package.json
  - README.md
  - appystack.json
  - .env.example
  - Procfile
  - shared/src/types.ts
  - shared/src/constants.ts
  - shared/src/index.ts
  - server/src/index.ts
  - server/src/routes/folder.ts
  - server/src/routes/rename.ts
  - server/src/routes/manifest.ts
  - server/src/routes/images.ts
  - server/src/routes/health.ts
  - server/src/routes/info.ts
  - server/src/helpers/renameHelpers.ts
  - server/src/helpers/manifestHelpers.ts
  - server/src/helpers/response.ts
  - server/src/helpers/AppError.ts
  - server/src/config/env.ts
  - client/src/App.tsx
  - client/src/utils/api.ts
  - client/src/contexts/FolderContext.tsx
  - client/src/contexts/ToastContext.tsx
  - client/src/components/SortedPane.tsx
  - client/src/components/UnsortedPane.tsx
  - client/src/components/PreviewPane.tsx
  - client/src/components/ExcludedPane.tsx
  - client/src/components/GroupDivider.tsx
  - client/src/components/ContextMenu.tsx
  - client/src/components/KebabMenu.tsx
  - client/src/components/ToastContainer.tsx
  - client/src/hooks/useDragDrop.ts
  - client/src/hooks/useManualEntry.ts
  - client/src/hooks/useKeyboardNav.ts
  - client/src/hooks/useContextMenu.ts
  - client/src/hooks/useExclusion.ts
  - client/src/hooks/useDividers.ts
  - client/src/hooks/useRecentFolders.ts
  - client/src/hooks/useClickOutside.ts
  - client/src/pages/ThumbRackApp.tsx
  - client/src/pages/LandingPage.tsx
  - scripts/start.sh
  - docs/planning/BACKLOG.md
  - docs/planning/thumbrack-feedback.md
  - context.globs.json
regenerate: 'Run /system-context in the repo root'
---

# ThumbRack — System Context

## Purpose

Desktop image sequencer that solves the pain of manually renaming numbered slides or storyboard frames — you drag thumbnails in a browser UI and the files on disk get renumbered to match, atomically and without collisions.

## Core Abstractions

- **FolderImage** — The atomic unit: a single image file on disk, carrying a `filename`, an absolute `path`, a parsed `number` prefix (or `null` if unprefixed), a `label` (filename without the prefix), and a `base64url`-encoded path used as a URL-safe key for the image-serving endpoint. Every list in the system is a list of `FolderImage` objects.

- **Three Buckets (Sorted / Unsorted / Excluded)** — Every image in a folder falls into exactly one bucket. Sorted images have a `NN-` prefix (e.g. `03-title.png`) and appear in the sequencing pane in numeric order. Unsorted images have no prefix and sit in the staging pane awaiting assignment. Excluded images are hidden from the workflow; their filenames are stored in the manifest. The buckets are computed fresh from disk on every load — bucket membership is derived from filename shape and manifest exclusions, not stored separately.

- **Manifest (`.thumbrack.json`)** — A per-folder JSON sidecar file that persists the three pieces of metadata that cannot be inferred from filenames: the exclusions list, the last-viewed filename, and the group-boundary filename anchors. The manifest is created automatically when first needed and updated in-place. It is the only writable state outside of the filenames themselves. If deleted, sorted/unsorted state is preserved (it lives in the filenames); only exclusions and dividers are lost.

- **Group Boundaries** — Thin visual dividers between sections in the sorted pane, stored in the manifest as a list of filenames. A boundary is "anchored to" the image it precedes: the divider appears immediately before the named image in the sorted list. When a reorder renames files, the server translates all boundary anchors to their new filenames atomically so dividers follow their images. A boundary at position 0 (before the first image) is nonsensical and is silently prevented or removed.

- **Two-Pass Rename** — The core filesystem operation. When reordering N files, a naive in-place rename is unsafe because target names collide with source names (e.g. swapping `01-a.png` and `02-b.png`). The two-pass strategy renames every affected file to a `__tmp_{i}__<original>` temp name first (pass 1), then renames each temp to its final target (pass 2). This guarantees the operation always completes without clobbering a file that hasn't been moved yet. Temp files with the `__tmp_` prefix are filtered from directory listings so they never appear in the UI.

## Key Workflows

### Opening a folder and entering the sequence

1. User types (or selects from recents dropdown) a directory path in the header input and presses Enter.
2. `FolderContext.loadFolder` calls `GET /api/folder?path=<dir>` — the server reads the directory, splits files into sorted/unsorted/excluded using the manifest exclusion list, and returns all three lists.
3. `loadFolder` then calls `GET /api/manifest?dir=<dir>` to fetch group boundary filenames (best-effort; silently falls back to empty on failure).
4. The UI renders three panes: sorted (left), preview (centre), unsorted (right). The last-viewed selection is **not** auto-restored on load — it resets to null; the user clicks to select.

### Reordering via drag-and-drop

1. User drags a thumbnail in the Sorted pane. `PointerSensor` requires an 8px movement before a drag activates (prevents clicks from being swallowed).
2. A `DragOverlay` floats a ghost card under the cursor. The drop target highlights with `is-over` styling.
3. On drop, `useDragDrop` calls `POST /api/reorder` with the full new filename order.
4. The server computes which files need new numbers, runs the two-pass rename, then updates group boundaries in the manifest to track renamed files.
5. `FolderContext.reload` re-fetches the folder and manifest; the sorted pane re-renders with updated numbers.

### Manually assigning a number via the badge

1. User clicks the `NN` badge on any sorted image — the badge becomes a numeric input pre-filled with the current number.
2. User types the desired number and presses Enter (or presses Escape to cancel).
3. `useManualEntry` checks if the target number is already occupied (collision check in client state). If occupied, shows an error toast and aborts without calling the server.
4. On success, calls `POST /api/rename` with the current filename and the new number. Server renames the single file (with temp-swap if a collision exists on disk) and responds with `{ success, renamedFiles }`.
5. `reload` refreshes the pane. Selection is restored to the renamed image.

### Managing group dividers

1. User right-clicks a sorted image to open the context menu and chooses "Add divider before this".
2. `useDividers.addDivider(filename)` saves the updated `groupBoundaries` list to the manifest via `POST /api/manifest?dir=`.
3. A `SortableDivider` element renders above that image in the list. Dividers are themselves draggable — dragging a divider to a new position calls `useDividers.moveDivider(oldAnchor, newAnchor)` which saves the updated manifest.
4. Right-clicking again offers "Remove divider". Dragging the anchor image onto its own divider auto-reanchors or auto-removes the divider intelligently.

### Excluding and restoring images

1. User right-clicks a sorted or unsorted image and selects "Exclude this image".
2. `useExclusion.exclude(filename)` fetches the current manifest, adds the filename to `excluded`, and saves via `POST /api/manifest?dir=`.
3. `reload` moves the image from sorted/unsorted to the excluded bucket. The excluded pane shows greyed-out thumbnails with a restore option.
4. Restoring removes the filename from the manifest exclusion list and triggers a reload.

## Design Decisions

- **Filesystem is the source of truth, not a database**: The server reads the directory on every load request. No in-memory state, no database, no sync problem. The manifest stores only what cannot be derived from filenames (exclusions, boundaries). This means the tool handles external file changes gracefully — rename a file in Finder and reload; it appears correctly in the new bucket.
  - _Alternative considered_: Keeping a persistent server-side store with full image metadata.
  - _Why rejected_: Adds synchronisation complexity. The filesystem already tracks what matters (filename = number + label). Single-user local tool doesn't need shared state.

- **`NN-label.ext` as the sole sequencing convention**: Numbers are two-digit zero-padded integers 01-99. This is a hard constraint — the pattern `^\d{2}-(.+)$` is the only thing that marks an image as "sorted." Files not matching this pattern are "unsorted" regardless of filename.
  - _Alternative considered_: Arbitrary numbering schemes (1-, 001-, etc.) or metadata-based ordering.
  - _Why rejected_: A rigid naming convention lets the tool be stateless about order — you can open any folder and the sequence is self-evident from filenames. Also makes manual inspection trivial.

- **Two-pass rename for all reorder operations**: Rather than renaming files one-by-one (unsafe under collision), the server always uses temp names as an intermediate step.
  - _Alternative considered_: Detecting non-colliding files and only using temp for colliding pairs.
  - _Why rejected_: Partial-rename strategies require careful analysis of the dependency graph between source and target names. The uniform two-pass approach is simpler to reason about, test, and debug. Performance difference is negligible for 1-99 files.

- **Base64url-encoded paths for the image endpoint**: `GET /api/images/:encodedPath` decodes the base64url path and serves the file directly. This sidesteps URL-encoding issues with arbitrary filesystem paths (spaces, parentheses, non-ASCII characters in filenames).
  - _Alternative considered_: URL-percent-encoding the path; serving images via a numeric ID from a database.
  - _Why rejected_: Percent-encoding nested paths on different OS path separators is error-prone. A stateless encoding that survives round-trips through browser URL handling is more reliable.

- **dnd-kit `PointerSensor` with `activationConstraint: { distance: 8 }`**: Drag activation requires 8px of pointer movement before a drag starts. Without this, single-click on a draggable card fires a drag event that swallows the click, making card selection impossible.
  - _Alternative considered_: Using a dedicated drag handle as the only drag target (as in UnsortedPane).
  - _Why rejected_: Full-card draggable is more ergonomic in the sorted pane. The distance constraint solves the swallowed-click problem without restricting the drag target area.

- **Group boundaries anchored to the image after the divider, not before**: The manifest stores the filename of the first image in the new group (the one that appears below the line), not the last image of the group above. This makes boundary translation after a reorder straightforward — the anchor moves with its image.
  - _Alternative considered_: Storing an index-based position.
  - _Why rejected_: Index positions become stale immediately after any reorder. Filename-based anchors stay valid as long as the file exists, and the reorder endpoint translates them atomically.

## Non-obvious Constraints

- **Numbers are 1-99 only, not 0-100+**: The server validates `newNumber` as integer 1-99. The client also enforces this. You cannot have a `00-` prefix — the number 0 would produce `00-` which the server would reject. If a folder needs more than 99 images in sequence, ThumbRack cannot handle it.

- **A divider cannot be placed before the very first item**: The UI silently refuses to drop a divider at position 0. Dragging a divider to the top position, or dragging the first image item onto its preceding divider, triggers auto-removal of the divider rather than placing it at position 0. This is intentional — a divider before the first item is meaningless (there is no "group above").

- **`__tmp_` files appear during a rename and vanish**: If a rename is interrupted mid-operation (server crash, process kill), temp files named `__tmp_N__<originalname>` may be left on disk. The folder endpoint filters these from directory listings (`if (filename.startsWith('__tmp_')) continue`), so they are invisible in the UI. They must be cleaned up manually from the filesystem.

- **Home directory shorthand (`~/`) is supported in dir paths**: The folder endpoint expands `~/` to the user's home directory. Other shell-style path shortcuts (e.g. `~username/`, `$HOME`, `..`) are not expanded.

- **Selection is lost on every reload**: `FolderContext.loadFolder` always resets `selected` to `null`. Only the `reload` function (which wraps `loadFolder`) attempts to restore the previous selection by matching `filename` in the refreshed sorted list via `sortedRef.current`. After a rename, the restored match finds the image at its new filename — but only if the reload pathway went through `reload`, not a fresh `loadFolder` call.

- **The manifest is best-effort from the client's perspective**: On load, `FolderContext` makes two sequential API calls: one for the folder listing and one for the manifest. The manifest call is inside an inner `try/catch` that silently falls back to an empty boundaries array. A 404 from the manifest endpoint (e.g. no `.thumbrack.json` yet) is not an error — the manifest is created on first write.

- **Divider IDs use a `__div:` prefix in dnd-kit**: In the SortableContext, dividers are interleaved with image items using IDs like `__div:03-title.png`. This prefix is how SortedPane distinguishes drag events on dividers from drag events on images. The prefix is stripped to get the anchor filename for manifest operations.

- **The image endpoint validates file extensions server-side**: `GET /api/images/:encodedPath` only serves `.png`, `.jpg`, `.jpeg` files. Any other extension returns a 400 error. This prevents the base64url decoding from being abused to serve arbitrary files.

## Expert Mental Model

- **The filename is the state, not the UI**: After any reorder, the files on disk have been renamed. The client state is a view derived from those names — always read-after-write via `reload`. An expert does not think of the sorted list as "the order ThumbRack tracks"; they think of it as "the filenames read from disk, parsed." This means: if you manually rename files in Finder while ThumbRack is open, a reload will reflect the changes correctly.

- **Dividers are pure manifest metadata; they never touch filenames**: An expert working with boundaries understands that removing all `.thumbrack.json` files will silently remove all dividers from all folders, leaving the image sequence completely intact. Boundaries are cosmetic grouping — they add no information to the filenames themselves.

- **The two-pass rename is the only operation that touches disk**: Every user action ultimately compiles down to either a `POST /api/reorder` or a `POST /api/rename`. Everything else (exclusion, dividers, manifest, last-viewed) writes only to `.thumbrack.json`. An expert debugging filesystem state checks: are the filenames correct? Is the manifest correct? Those are the only two places state lives.

- **`encodedPath` is a deterministic, stateless key**: The encoded path is `Buffer.from(absolutePath).toString('base64url')`. Given the same absolute path, you always get the same encoded path. The image endpoint simply decodes it. There is no lookup table, no cache — just a reversible encoding. This means encoded paths in the DOM will change if the directory path changes (e.g. user types a different path), but they will not change between reloads of the same folder.

- **The sorted list is always re-derived from disk, never speculatively updated**: The client never optimistically updates the sorted list in state. After every drag-end or rename, it calls `reload` (which calls the server). This is a deliberate simplicity trade-off — it means there is always a brief flicker on reorder, but it guarantees the UI reflects ground truth rather than assumed state.

- **The client has two fetch layers and they serve different purposes**: The generic `api` object (`request()` function using `BASE_URL`) is the AppyStack template's generic HTTP helper. The ThumbRack-specific helpers (`thumbRequest()`, `fetchFolder()`, etc.) use `BASE` (which falls back to `http://localhost:5021`) and unwrap the `ApiEnvelope` wrapper. New ThumbRack endpoints should use the `thumbRequest` layer, not the generic `api` object.

## Scope Limits

- Does NOT work with remote or cloud-backed directories — only local filesystem paths accessible to the Node.js process running the server.
- Does NOT edit image content — no crop, resize, rotate, annotate, or convert. Reorders and renumbers only.
- Does NOT support `.gif`, `.webp`, `.svg`, `.bmp`, or other formats — only `.png`, `.jpg`, `.jpeg`.
- Does NOT handle folders with more than 99 images in sequence — the `NN-` convention is two digits (01-99).
- Does NOT span multiple folders in one session — operates on one directory at a time.
- Does NOT have user accounts, authentication, or multi-user access — single-user local tool with no auth layer.
- Does NOT provide undo for rename operations — once files are renamed, reverting requires a manual re-drag or the planned B014 undo feature (currently backlogged).
- Does NOT use Socket.io for any ThumbRack features — the wiring exists from the AppyStack template but is unused scaffolding.

## Failure Modes

- **`__tmp_` orphans after interrupted rename**: If the server process dies mid-two-pass-rename, files named `__tmp_N__<originalname>` are left on disk. The folder endpoint hides them from the UI, but they occupy disk space and may cause confusion in Finder. Recognition: files with `__tmp_` prefix visible in the filesystem. Fix: manually rename or delete the temp files; the original files are likely under their temp names.

- **Stale manifest boundaries after external file rename**: If a user renames or deletes files outside ThumbRack, `.thumbrack.json` boundary anchors may point to filenames that no longer exist. On reload, the boundary silently disappears from the UI (the `groupBoundaries` filter in `SortedPane` just finds no match). Recognition: a divider that was visible is gone after reload. Fix: the "Regenerate Manifest" action in the kebab menu reconciles the manifest against current filenames, removing stale entries.

- **Manual badge rename leaves a gap in the sequence**: `POST /api/rename` moves a single file to a new number without renumbering other files. If you rename `05-foo.png` to `07-foo.png`, there is now no `05-` and there are two files competing for position 7 (the existing `07-bar.png` is displaced via temp-swap). This is by design for single-file moves, but the sequence now has a gap at 5. Recognition: gap visible in the sorted pane. Fix: drag-to-reorder the full list to close gaps, which triggers a full `POST /api/reorder` that renumbers everything consecutively.

- **Duplicate numbers after concurrent or external changes**: The client's collision check in `useManualEntry` reads from in-memory state at the time of the edit. If files were changed externally (or in another tab) since last reload, the client state may be stale. The server does not enforce uniqueness on `POST /api/rename` — it will overwrite if forced. Recognition: missing image in the sequence, unexpected label appearing on a number. Fix: reload the folder to sync with disk state before making manual edits.

- **Directory not found after path change**: If the directory typed by the user does not exist, the server returns `404 Directory not found`. The `FolderContext.loadFolder` sets `error` state and the UI displays the error message. Recognition: red error message in place of the pane content. Not a bug — the folder path needs to be re-typed or selected from recents.

- **`~/Downloads` pre-fill on startup shows no images**: On first load the folder input is pre-filled with `~/Downloads`. If the user has no `.png`, `.jpg`, or `.jpeg` files there, all three panes show "No images" / empty states. This looks like a crash but is correct behaviour. Recognition: empty panes with no error message. Fix: navigate to a folder that contains images.

- **Silent failure on exclusion/divider network errors**: The `useExclusion` and `useDividers` hooks catch all errors from manifest read/write and show a toast notification. The operation silently fails — the UI does not retry. Recognition: toast message like "Failed to exclude image" or "Failed to add divider". Fix: retry the operation or reload the folder to re-sync state.
