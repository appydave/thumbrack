# Assessment: ThumbRack Wave 4

**Campaign**: thumbrack-wave4
**Date**: 2026-03-13 → 2026-03-14
**Results**: 5 complete, 0 failed

## Results Summary

| Work Unit                 | Status | Outcome                                                          |
| ------------------------- | ------ | ---------------------------------------------------------------- |
| fix-drag-ux (WU-1+WU-3)   | ✅     | opacity 0.6, .drag-source class, full-card drag                  |
| fix-drag-deselects (WU-2) | ✅     | sortedRef + reload restore logic in FolderContext                |
| schema-dividers (WU-4)    | ✅     | groupBoundaries in ManifestData, reorder translation, AP-8 fix   |
| render-dividers (WU-5)    | ✅     | GroupDivider component, useDividers hook, context menu, 11 tests |
| test-fixes (post-merge)   | ✅     | FolderContext reload tests updated for 2-fetch pattern           |

Final test count: **307/307 passing** (client + server)

## What Worked Well

- Combining WU-1+WU-3 into one agent (`fix-drag-ux`) avoided the file conflict in SortedPane.tsx
- The useExclusion pattern served as a clean template for useDividers — agent produced correct hook on first pass
- `sortedRef = useRef<FolderImage[]>([])` elegantly solved the stale-closure problem in reload() without race conditions
- filename-anchor model for dividers is transparent to drag reorder — the rename endpoint translates groupBoundaries atomically alongside image renaming

## What Didn't Work

- **WU-4 and WU-5 conflict on shared/types.ts and manifestHelpers.ts**: WU-5 agent re-did schema work already in main. Required careful merge. Could be avoided by having WU-5 reference the already-merged WU-4 state explicitly in its prompt.
- **AP-8 bug (manifest POST dropping groupBoundaries)**: Slipped through WU-4 review — the POST handler extracted only `excluded` and `lastViewed`, silently discarding `groupBoundaries`. Caught in post-merge review, fixed before final commit.
- **FolderContext test mock count**: loadFolder now makes 2 fetch calls (folder + manifest). Two reload tests only had 1 mock per loadFolder call, causing the manifest call to consume the wrong mock response. Fixed after merge.
- **WU-5 eslint failure on commit**: `_gb` unused variable in destructuring pattern. Required eslint-disable comment before lint passed.

## Key Learnings — Application

- **loadFolder makes 2 fetch calls**: Any test mocking global `fetch` needs 2 mock responses per `loadFolder` call — one for fetchFolder, one for fetchManifest. Document this in AGENTS.md.
- **POST endpoint body extraction**: When adding a new optional field to ManifestData, always check the POST handler in manifest.ts also extracts and saves that field. Optional fields are easy to miss.
- **useRef for cross-callback fresh state**: When a callback needs to read state that another async operation just set, use `useRef` kept in sync — not `useState` which would require an additional render cycle.
- **GroupDivider outside SortableContext items**: Non-draggable sibling elements inside a `<ul>` managed by SortableContext work correctly as long as their keys are not in the `sortedIds` array passed to `SortableContext`.

## Key Learnings — Ralph Loop

- **WU-5 worktree persisted past session**: The agent completed but the worktree wasn't committed before context was exhausted. Safe to pick up at start of next session — changes are in the worktree's working tree.
- **Schema work re-done by dependent agent**: WU-5 re-touched files already modified by the merged WU-4. Prompt WU-5 agents to `git pull` or inspect current main state before writing. Or explicitly list what's already done.
- **Merge conflict resolution took ~15 mins**: CSS conflict required taking both sections (sidebar-size-controls + group-divider). Took attention to not drop either. Consider sequencing WU-5 strictly after all Wave A worktrees are merged next time.

## Suggestions for Next Campaign

- Add to AGENTS.md: "loadFolder makes 2 fetch calls; tests need 2 mock responses per call"
- Add to AGENTS.md: "When adding fields to ManifestData, update manifest.ts POST handler body extraction"
- Add to AGENTS.md: "WU-5 agent re-did WU-4 schema work — for dependent WUs, include 'already done in main' notes"
- B019 (27 pre-existing test failures) is still open — highest priority for wave 5
- B023 (useExclusion silent error handling) and B024 (rename collision server tests) are good wave 5 candidates
- useDragDrop.ts has silent catch blocks flagged by codebase review — worth addressing next wave
