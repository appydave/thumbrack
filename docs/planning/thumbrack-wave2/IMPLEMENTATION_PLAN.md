# IMPLEMENTATION_PLAN.md — ThumbRack Wave 2

**Goal**: UAT polish pass — sidebar size presets, default folder + recent paths, UI polish (regenerate tooltip), preview zoom modes.
**Started**: 2026-03-08
**Target**: All 4 work units complete. All feedback items F001/F004/F005/F006 resolved. B013 (zoom) shipped.

## Summary
- Total: 4 | Complete: 4 | In Progress: 0 | Pending: 0 | Failed: 0

## Dependency Order

```
WU-1 (client-sidebar-size)    ─── independent
WU-2 (client-default-folder)  ─── independent
WU-3 (client-ui-polish)       ─── independent
WU-4 (client-preview-zoom)    ─── independent
```

**Wave A** (all parallel): WU-1, WU-2, WU-3, WU-4

---

## Pending

## In Progress

- [x] client-sidebar-size — S/M/L toggle buttons on sidebar. S=180px (hides filenames via data-sidebar-size CSS hook), M=288px, L=420px default. Persists to localStorage. 8 new tests. Also fixed 6 pre-existing test failures. TypeScript clean.
- [x] client-default-folder — `~/Downloads` default input, useRecentFolders hook (max-5 dedup, localStorage), useClickOutside hook, ▼ dropdown in ThumbRackApp. 14+3+5 new tests. TypeScript clean.
- [x] client-ui-polish — KebabMenu component (17 tests). Replaced Regenerate button with ⋮ menu → "Regenerate Manifest" item. Closes on Escape/outside click/item select. TypeScript clean. Server 149, Client 258 passing (27 pre-existing failures unchanged).
- [x] client-preview-zoom — ZoomToolbar (Fit/Fill/Actual) in PreviewPane. Actual mode sets container overflow:auto. Persists to localStorage. 18 new tests (28 total in PreviewPane). Also fixed pre-existing useManualEntry TS error + removed dead functions. TypeScript clean.

## Complete

## Failed / Needs Retry

## Notes & Decisions

- **Sidebar default**: Start on L (420px) since F001 notes "almost double the current width was suggested" and full filenames are the primary use case.
- **Recent folders**: Use localStorage key `thumbrack:recentFolders`. Max 5 entries. Most-recent first. Deduplicate on add.
- **Regenerate placement**: Move to a `⋮` (vertical ellipsis) kebab button in the header. The kebab menu shows only "Regenerate Manifest" for now — designed to accept future items.
- **Preview zoom default**: Fit (object-contain) keeps the current visual behaviour. Toggle state is local to PreviewPane (no need for context).
