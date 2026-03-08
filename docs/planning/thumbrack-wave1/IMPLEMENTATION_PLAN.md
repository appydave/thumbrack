# IMPLEMENTATION_PLAN.md — ThumbRack Wave 1

**Goal**: Build the full ThumbRack MVP — a local image sequencer that lets you view, drag-to-reorder, and renumber images in a folder using a two-digit filename prefix convention.
**Started**: 2026-03-08
**Target**: All 12 work units complete. App runs on localhost:5020. You can load a folder, view images, drag to reorder, and filenames are renamed immediately on drop.

## Summary
- Total: 12 | Complete: 12 | In Progress: 0 | Pending: 0 | Failed: 0

## Pending

## In Progress

## Complete

### Client — Polish
- [x] client-manifest-ui — ToastContext, ToastContainer, Regenerate button. Auto-dismiss at 3s (fake timer tested). 12 tests passing.
- [x] client-keyboard — useKeyboardNav, arrow navigation across sorted/unsorted, F2/e edit shortcut, INPUT guard. 20 tests passing.

### Client — Core Interaction
- [x] client-unsorted-pane — Unnumbered bucket, selection, thumbnail error handling, data-id for dnd. 16 tests passing.
- [x] client-drag-drop — dnd-kit installed, useDragDrop hook, sorted reorder + unsorted→sorted drop, DragOverlay. 12 hook tests passing.
- [x] client-manual-entry — useManualEntry hook, 1–99 validation, inline input in SortedPane. 19 tests passing.
- [x] client-exclusion — ContextMenu, useExclusion, ExcludedPane, right-click on all panes, manifest persistence. 37 tests passing.

### Client — Foundation
- [x] client-app-shell — FolderContext, ThumbRackApp layout, directory input, API utilities, demo/ deleted. 8 tests passing.
- [x] client-sorted-pane — Numbered thumbnail list, selection highlight, error thumbnail, lazy loading. 16 tests passing.
- [x] client-preview-pane — Large preview, empty state, error state, filename/path labels. 10 tests passing.

### Server
- [x] server-folder-api — GET /api/folder + GET /api/images/:encodedPath. 18 tests passing. Sorted/unsorted/excluded split, encodedPath round-trip, extension validation on image serving.
- [x] server-rename-api — POST /api/rename + POST /api/reorder. 28 tests passing. Two-pass temp-rename strategy unit tested. All validation paths covered.
- [x] server-manifest-api — GET/POST /api/manifest + POST /api/manifest/regenerate. 24 tests passing. Graceful handling of missing/malformed manifest. Stale exclusion cleanup verified.

## Failed / Needs Retry

## Notes & Decisions

- **Folder selection**: Path text input + Load button. Server validates path exists and is readable. No browser file picker API — keeps it simple and works in any browser.
- **Drag library**: @dnd-kit/core + @dnd-kit/sortable. Modern, accessible, no jQuery dependency.
- **Image serving**: Server exposes GET /api/images/:encodedPath — encodes the full absolute path, serves the file with correct content-type. Client constructs img src from this route.
- **Naming convention**: Two-digit zero-padded prefix — 01 through 99. Files without this prefix are unsorted. Files with it are sorted numerically then alphabetically.
- **Rename strategy**: Temp-rename conflict resolution — when a sequence of renames could collide, rename colliding files to `__tmp_N__filename` first, then apply final names. User never sees this.
- **Manifest**: `.thumbrack.json` hidden dot-file in the viewed folder. Stores `{ excluded: string[], lastViewed: string | null }`. Filenames are source of truth for order — manifest never overrides them.
- **Socket.io**: Not used for ThumbRack. Pure REST — no real-time push needed.
- **Exclusion in manifest**: Excluded filenames stored as a list. On folder load, any excluded filename found in the folder is moved to the excluded section, not shown in sorted/unsorted.
- **Wave grouping**: server units first, then foundation client (app shell + sorted + preview), then core interaction (unsorted + drag + manual entry), then polish (exclusion + manifest UI + keyboard).
- **Wave 1 result**: All 3 server units complete. 149 server tests + 104 client tests all green. Port mismatch in env.test.ts fixed (5501→5021, 5500→5020).
