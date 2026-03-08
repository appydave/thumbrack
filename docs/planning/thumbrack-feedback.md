# ThumbRack Feedback

**Last updated**: 2026-03-08
**Status**: Post wave-1 UAT — capturing issues for wave 2 planning

---

## Open Items

### F001 — Sidebar too narrow, filenames cut off
**Type**: ux
**Priority**: high
**Where**: Left sidebar (Sorted / Unsorted / Excluded panes)
**What I saw**: Filenames like `ecamm-reading-companion-module-open-source.png` truncate at ~22 characters, making it hard to distinguish files.
**What I expected**: Filenames should be readable. Either a wider sidebar or a small/medium/large size preset (like FliDeck). "Almost double" the current width was suggested.
**Notes**: Quick win — sidebar CSS variable bumped from 288px → 420px as immediate fix. Resizable sidebar or size presets are the proper solution.

---

### F002 — Duplicate numbers allowed when renaming via badge
**Type**: bug
**Priority**: high
**Where**: Sorted pane — number badge click to edit
**What I saw**: Renamed item 13 → 01. Now had two items with number 01. The list showed two `01` badges.
**What I expected**: Either (a) block the rename with an error if the number is already taken, or (b) shift the existing occupant up automatically, or (c) show a confirmation warning.
**Notes**: Root cause — badge rename calls `/api/rename` directly with no collision detection. The drag-reorder two-pass rename handles collisions correctly, but badge edit does not. Fix needed: server-side or client-side collision check before applying rename.

---

### F003 — Clicking an unsorted image does not open preview
**Type**: bug
**Priority**: high
**Where**: Unsorted pane
**What I saw**: Clicking an item in the Unsorted section does nothing — the preview pane stays empty.
**What I expected**: Clicking any image (sorted or unsorted) should show it in the preview pane.
**Notes**: Root cause — dnd-kit `{...listeners}` is spread on the entire `<li>` element in UnsortedPane, intercepting pointer events before the `onClick` handler fires. Same pattern as the drag-handle bug fixed in SortedPane during wave 1. Fix: add a dedicated drag handle `<div>` to UnsortedItem and move `{...listeners}` off the `<li>`.

---

### F004 — No default folder / quick-access folders
**Type**: ux
**Priority**: medium
**Where**: Header — directory path input
**What I saw**: On load, the path input is blank. You must type or paste the full path every time.
**What I expected**: A default folder (e.g. `~/Downloads`) pre-filled, or a dropdown of common/recent folders.
**Notes**: Short-term: pre-fill with `~/Downloads` as default. Medium-term: a small dropdown of quick-access paths (Downloads, Desktop, and recently loaded folders). Not a configured system right now — just sensible defaults.

---

### F005 — Regenerate button purpose unclear
**Type**: ux
**Priority**: low
**Where**: Header — Regenerate button
**What I saw**: The button exists with no tooltip or explanation.
**What I expected**: A tooltip or inline label explaining what it does before clicking it.
**Notes**: Regenerate deletes and rebuilds `.thumbrack.json` from scratch by re-scanning the folder. Useful recovery tool when the manifest gets out of sync. A `title` tooltip attribute would be sufficient. Longer-term: move it to a kebab/options menu so it doesn't clutter the header.

---

### F006 — Sidebar resize or small/medium/large presets
**Type**: feature
**Priority**: medium
**Where**: Left sidebar
**What I saw**: Fixed sidebar width — no way to adjust it.
**What I expected**: Either a drag-to-resize handle on the sidebar divider, or size toggle buttons (S / M / L) like FliDeck uses.
**Notes**: Small = filmstrip thumbnails only, Medium = current layout, Large = wider with full filenames. FliDeck pattern is the reference implementation.

---

## Resolved Items

_(none yet — first feedback pass)_
