# ThumbRack Feedback

**Last updated**: 2026-03-08
**Status**: Post wave-2 — all UAT items resolved

---

## Open Items

(none)

---

## Resolved Items

| # | Item | Resolved in |
|---|------|-------------|
| F001 | Sidebar too narrow, filenames cut off | wave-2 — S/M/L sidebar size presets added (default L=420px). data-sidebar-size CSS hook hides filenames in S filmstrip mode. |
| F002 | Duplicate numbers allowed when renaming via badge | wave-1 bugfix — collision check added to `useManualEntry`, blocks rename with error toast "Number XX is already taken" |
| F003 | Clicking an unsorted image does not open preview | wave-1 bugfix — moved `{...listeners}` off `<li>` onto dedicated drag handle `<div>` in `UnsortedPane`, same pattern as SortedPane fix |
| F004 | No default folder / quick-access folders | wave-2 — `~/Downloads` pre-filled on load. useRecentFolders hook stores last 5 paths. ▼ dropdown in header. |
| F005 | Regenerate button purpose unclear | wave-2 — Moved Regenerate into ⋮ KebabMenu. Item labelled "Regenerate Manifest" with description tooltip "Rebuilds .thumbrack.json from scratch". |
| F006 | Sidebar resize or small/medium/large presets | wave-2 — resolved with F001 — S/M/L toggle buttons in sidebar header. |
