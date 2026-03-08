# IMPLEMENTATION_PLAN.md — ThumbRack Wave 1

**Goal**: Build the full ThumbRack MVP — a local image sequencer that lets you view, drag-to-reorder, and renumber images in a folder using a two-digit filename prefix convention.
**Started**: 2026-03-08
**Target**: All 12 work units complete. App runs on localhost:5020. You can load a folder, view images, drag to reorder, and filenames are renamed immediately on drop.

## Summary
- Total: 12 | Complete: 0 | In Progress: 0 | Pending: 12 | Failed: 0

## Pending

### Server
- [ ] server-folder-api — GET /api/folder?path= returns sorted + unsorted image lists; GET /api/images/:encodedPath serves image files as static assets
- [ ] server-rename-api — POST /api/rename handles single-file rename with temp-swap conflict resolution; POST /api/reorder handles full sequence reorder (renumbers all affected files)
- [ ] server-manifest-api — GET/POST /api/manifest?dir= reads/writes .thumbrack.json; POST /api/manifest/regenerate reconciles manifest against current folder contents

### Client — Foundation
- [ ] client-app-shell — Three-pane layout (left panel with two sub-panes + right preview), directory path input + Load button, global folder state via React context, error/empty states
- [ ] client-sorted-pane — Numbered thumbnail list (01–99), click to select and preview, shows number prefix + filename, scroll if overflow
- [ ] client-preview-pane — Large image display on right side, shows selected image, filename label below, handles no-selection state

### Client — Core Interaction
- [ ] client-unsorted-pane — Unnumbered images bucket below sorted list, separated by a divider label, click to select and preview
- [ ] client-drag-drop — dnd-kit sortable for sorted list reorder; drag from unsorted bucket into sorted list at a specific position; bold insertion line + colour highlight on drag over; immediate rename on drop
- [ ] client-manual-entry — Select any sorted image, click its number badge or press a shortcut, type new number, Enter to reassign; file renamed immediately; list re-sorts by number then alpha; no other files move
- [ ] client-exclusion — Right-click context menu on any image → Exclude / Un-exclude; excluded images shown greyed-out in a third section below unsorted bucket; exclusions stored in manifest

### Client — Polish
- [ ] client-manifest-ui — Regenerate button in header calls POST /api/manifest/regenerate and reloads folder; toast notifications for rename success, rename failure, manifest regenerated; toasts auto-dismiss after 3s
- [ ] client-keyboard — Arrow up/down navigate the sorted list; arrow up/down in unsorted bucket navigates that list; selected image previews on arrow key; number+Enter shortcut triggers manual entry mode

## In Progress

## Complete

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
- **Wave grouping**: server units first (agents can work in parallel), then foundation client (app shell + sorted + preview), then core interaction (unsorted + drag + manual entry), then polish (exclusion + manifest UI + keyboard).
