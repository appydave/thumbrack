# IMPLEMENTATION_PLAN.md — ThumbRack Wave 4

**Goal**: Drag UX fixes + divider/boundary feature — fix three drag bugs (opacity, deselect, handle-only), then build the visual divider system for grouping images in the sorted pane.
**Started**: 2026-03-13
**Target**: All 5 work units complete. Drag bugs resolved. Dividers render, persist to manifest, survive reorders, and can be added/removed via context menu.

## Summary

- Total: 5 | Complete: 0 | In Progress: 0 | Pending: 5 | Failed: 0

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

File conflict check:

- WU-1 and WU-3 both touch SortedPane.tsx — **sequence these**: assign to different agents but with clear line boundaries, OR combine into one unit. See Notes.
- WU-2 touches FolderContext.tsx only
- WU-4 touches shared/types.ts, manifestHelpers.ts, rename.ts (server)
- WU-5 touches SortedPane.tsx, ContextMenu.tsx, useDragDrop.ts (must be after WU-3)

---

## Pending

- [ ] fix-drag-opacity — The dragged item (source position) fades to opacity 0.35 during drag, which renders as near-black over the dark background (#0d0b08). Change to a more visible value (0.6) and add a `.drag-source` CSS class so the faded slot is visually clear without disappearing.
- [ ] fix-drag-deselects — After every drag-and-drop reorder, reload() is called which resets selected to null in FolderContext.loadFolder(). This clears the preview pane after every drag. Fix: capture the selected filename before reload, restore it after reload completes.
- [ ] fix-full-card-drag — Drag is currently restricted to the 20px ⠿ handle icon (listeners are on the handle <div>, not the <li>). Move {...listeners} to the <li> element so the entire card is draggable. Keep the handle icon visible but decorative. Update tests.
- [ ] schema-dividers — Add groupBoundaries?: string[] to ManifestData in shared/src/types.ts. Update manifestHelpers.ts to read/write the field. Update the reorder endpoint (rename.ts POST /api/reorder) to translate boundary filenames to their new names after a reorder (since filenames change, boundary anchors must be updated atomically in the same operation). Add tests.
- [ ] render-dividers — GroupDivider component (thin amber horizontal rule with optional remove button). Inject between SortedPane items when image.filename is in groupBoundaries. Add "Add divider before this" and "Remove divider" to the right-click context menu. Wire to manifest save via useExclusion-style hook pattern. Add tests.

## In Progress

## Complete

## Failed / Needs Retry

## Notes & Decisions

- **WU-1 + WU-3 file conflict**: Both touch SortedPane.tsx. Options: (a) combine into one agent, (b) assign WU-1 to lines 59–69 (style block) and WU-3 to lines 96–113 (li/handle block) with explicit line boundaries in the prompt, (c) sequence WU-1 before WU-3. Recommended: combine into one agent called `fix-drag-ux` covering opacity + full-card drag in one pass.
- **Divider storage model**: groupBoundaries is a string[] of filenames. A filename in this list means "render a divider BEFORE this image." This is the filename-anchor approach — boundaries are tethered to specific files, not positions. When a reorder renames files, the reorder endpoint must translate old→new filenames for all entries in groupBoundaries.
- **Divider render position**: GroupDivider is rendered as a sibling element between SortableItems inside the SortableContext's <ul>. It must NOT be included in the sortedIds array passed to SortableContext — only draggable items go there.
- **Divider naming**: No names on dividers (that would be a "group" not a "divider"). Dividers are anonymous separators. A divider label is a stretch goal for a future wave.
- **Fix-drag-deselects approach**: In FolderContext, capture `selected?.filename` before calling loadFolder internally (reload). After loadFolder, call setSelected with the image from the new sorted list that matches the captured filename (if it still exists).
- **Opacity value**: 0.6 is more visible than 0.35 on the dark background. The ghost card (DragOverlay) shows the full-opacity version during drag — the source slot just needs to indicate "this spot is occupied" without vanishing.
- **Backlog items resolved by this wave**: B025, B026, B027, B028
