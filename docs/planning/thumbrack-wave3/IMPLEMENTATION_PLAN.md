# IMPLEMENTATION_PLAN.md — ThumbRack Wave 3

**Goal**: Code quality + test hygiene pass — fix 27 pre-existing test failures, eliminate code duplication, add missing coverage for high-risk paths, add error handling to silent failure paths.
**Started**: 2026-03-13
**Target**: All 5 work units complete. Zero pre-existing test failures. No duplicate utility functions. Server collision path tested. useExclusion errors visible to user.

## Summary

- Total: 5 | Complete: 5 | In Progress: 0 | Pending: 0 | Failed: 0

## Dependency Order

```
WU-1 (fix-test-assertions)         — independent (test files only)
WU-2 (extract-client-utilities)    — independent (ThumbRackApp.tsx, PreviewPane.tsx, new storage.ts)
WU-3 (fix-server-duplication)      — independent (server/src/routes/folder.ts)
WU-4 (useExclusion-error-handling) — independent (useExclusion.ts + useExclusion.test.ts)
WU-5 (test-rename-collision)       — independent (rename.test.ts additions only)
```

**Wave A** (all parallel): WU-1, WU-2, WU-3, WU-4, WU-5
No file conflicts — each work unit touches a distinct set of files.

---

## Pending

## In Progress

## Complete

- [x] fix-test-assertions — Fixed 27 pre-existing failures across 6 test files (SortedPane, UnsortedPane, ExcludedPane, ContextMenu, ToastContainer, useSocket). CSS class assertions corrected (bg-blue-100→selected, opacity-50→excluded-item, etc). Added missing ToastProvider wrapper in SortedPane tests. Fixed broken getSocketUrl import path. 290/290 client tests passing.
- [x] extract-client-utilities — Created client/src/lib/storage.ts (canonical readStorage/writeStorage). Removed duplicate imageUrl from PreviewPane.tsx (now imports from api.ts). Removed local readManifest from folder.ts (now imports from manifestHelpers.ts). Updated folder.test.ts mocks to use proper ENOENT errors to match manifestHelpers.ts stricter error handling.
- [x] delete-dead-scaffold — Deleted AppContext.tsx and AppContext.test.tsx. Confirmed zero real usages in app tree. Test count decreased by exactly 6 (expected). No new failures.
- [x] useExclusion-error-handling — Wrapped exclude() and unexclude() in try/catch with addToast on failure. Added 8 new error-path tests. Added ToastContext mocks to ExcludedPane, SortedPane, UnsortedPane tests (fixing additional pre-existing failures as a side effect).
- [x] test-rename-collision — Created rename-collision.test.ts with 4 real-filesystem tests (no-collision, single collision, no **tmp** files left, multi-collision). Server tests 149 → 153. All pass.

## Failed / Needs Retry

## Notes & Decisions

- **Pre-existing failure baseline**: Wave 2 ended with ~262 client tests passing, 27 pre-existing failures. Wave 3 goal: 0 pre-existing failures. Server stays at 149.
- **AppContext deletion**: AppContext.tsx is not imported anywhere in the app tree. Safe to delete. Its tests (AppContext.test.tsx) will naturally disappear with it.
- **readManifest duplication**: folder.ts has a more permissive implementation (Partial<ManifestData> cast) vs manifestHelpers.ts. Use manifestHelpers.ts as the canonical version. The folder route should import from there.
- **CSS class assertions**: Do NOT change them to check Tailwind classes — those don't exist. Check for `.selected` CSS class on `<li>` elements. Alternatively assert `aria-selected="true"` which is already set by dnd-kit on selected items. Prefer checking the actual class name the CSS uses.
- **File conflict guard**: WU-1 and WU-3 (delete-dead-scaffold) both might touch AppContext.test.tsx. Assign AppContext.test.tsx deletion to WU-3 only — WU-1 should not touch it.
- **Backlog items resolved by this wave**: B019, B020, B021, B022, B023, B024
