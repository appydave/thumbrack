# IMPLEMENTATION_PLAN.md — ThumbRack Wave 4

**Goal**: Drag UX fixes + divider/boundary feature — fix three drag bugs (opacity, deselect, handle-only), then build the visual divider system for grouping images in the sorted pane.
**Started**: 2026-03-13
**Completed**: 2026-03-14
**Target**: All 5 work units complete. Drag bugs resolved. Dividers render, persist to manifest, survive reorders, and can be added/removed via context menu.

## Summary

- Total: 5 | Complete: 5 | In Progress: 0 | Pending: 0 | Failed: 0

## Dependency Order

```
WU-1 (fix-drag-opacity)     — independent
WU-2 (fix-drag-deselects)   — independent
WU-3 (fix-full-card-drag)   — independent
WU-4 (schema-dividers)      — independent (server + shared types)
WU-5 (render-dividers)      — DEPENDS ON WU-4 (needs groupBoundaries in manifest API)
```

**Wave A** (parallel): WU-1, WU-2, WU-3, WU-4
**Wave B** (after Wave A): WU-5

---

## Pending

## In Progress

## Complete

- [x] fix-drag-ux — Opacity 0.35→0.6, .drag-source CSS class added, {...listeners} moved to <li> for full-card drag. Handle kept decorative.
- [x] fix-drag-deselects — sortedRef added to FolderContext; reload() captures selected filename and restores from refreshed list after load.
- [x] schema-dividers — groupBoundaries?: string[] added to ManifestData. manifestHelpers reads/writes it. reorder endpoint translates boundary filenames atomically. AP-8 fix: manifest POST now persists groupBoundaries. Tests added.
- [x] render-dividers — GroupDivider component (amber horizontal rule + remove button). useDividers hook (fetchManifest → update → saveManifest → reload). SortedPane injects GroupDivider before boundary items. Context menu: "Add divider before this" / "Remove divider". 11 new tests.
- [x] test-fixes — FolderContext reload tests updated with manifest mock responses (each loadFolder now makes 2 fetch calls: folder + manifest).

## Failed / Needs Retry

## Notes & Decisions

- **WU-1 + WU-3 file conflict**: Both touch SortedPane.tsx. Options: (a) combine into one agent, (b) assign WU-1 to lines 59–69 (style block) and WU-3 to lines 96–113 (li/handle block) with explicit line boundaries in the prompt, (c) sequence WU-1 before WU-3. Recommended: combine into one agent called `fix-drag-ux` covering opacity + full-card drag in one pass.
- **Divider storage model**: groupBoundaries is a string[] of filenames. A filename in this list means "render a divider BEFORE this image." This is the filename-anchor approach — boundaries are tethered to specific files, not positions. When a reorder renames files, the reorder endpoint must translate old→new filenames for all entries in groupBoundaries.
- **Divider render position**: GroupDivider is rendered as a sibling element between SortableItems inside the SortableContext's <ul>. It must NOT be included in the sortedIds array passed to SortableContext — only draggable items go there.
- **Divider naming**: No names on dividers (that would be a "group" not a "divider"). Dividers are anonymous separators. A divider label is a stretch goal for a future wave.
- **Fix-drag-deselects approach**: In FolderContext, capture `selected?.filename` before calling loadFolder internally (reload). After loadFolder, call setSelected with the image from the new sorted list that matches the captured filename (if it still exists). useRef used to avoid stale closure — sortedRef.current is updated synchronously inside loadFolder.
- **AP-8 (manifest POST dropping groupBoundaries)**: manifest.ts POST handler was only extracting `excluded` and `lastViewed`. Fixed to also extract and persist `groupBoundaries`.
- **loadFolder makes 2 fetch calls**: fetchFolder + fetchManifest. Tests that mock `fetch` globally need 2 mock responses per loadFolder call (folder response + manifest response).
- **Opacity value**: 0.6 is more visible than 0.35 on the dark background. The ghost card (DragOverlay) shows the full-opacity version during drag — the source slot just needs to indicate "this spot is occupied" without vanishing.
- **Backlog items resolved by this wave**: B025, B026, B027, B028
